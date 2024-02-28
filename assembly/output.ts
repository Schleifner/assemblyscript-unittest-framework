import { assertResult } from "./assertCollector";
import { outputTrace } from "./covInstrument";

import {
  args_sizes_get,
  args_get,
  errno,
  errnoToString,
  fd,
  path_open,
  lookupflags,
  rights,
  oflags,
  fdflags,
  iovec,
  fd_write,
  fd_close,
} from "@assemblyscript/wasi-shim/assembly/bindings/wasi_snapshot_preview1";

export function output(): void {
  const kvPair: string[] = [];
  kvPair.push(assertResult.totalString());
  kvPair.push(assertResult.failString());
  kvPair.push(assertResult.failInfoString());
  assertResult.clear();

  outputTrace();

  const outputString = "{" + kvPair.join(",") + "}";

  const outputFileName = getArgs()[1].slice(0, -5) + ".assert.log";
  writeFile(outputFileName, outputString);
}

let ret: errno;

function perror(msg: string): void {
  if (ret == errno.SUCCESS) {
    return;
  }
  assert(false, errnoToString(ret) + " " + msg);
}

function checkMemory(offset: usize): void {
  assert(offset < usize(i32.MAX_VALUE), "OOM");
}

function fromCString(cstring: usize): string {
  let size = 0;
  while (load<u8>(cstring + size) !== 0) {
    size++;
  }
  return String.UTF8.decodeUnsafe(cstring, size);
}

function getArgs(): string[] {
  const args: string[] = [];

  const count_and_size = memory.data(sizeof<usize>() * 2);
  checkMemory(count_and_size + sizeof<usize>() * 2);
  ret = args_sizes_get(count_and_size, count_and_size + 4);
  perror("args_sizes_get");
  const argc = load<usize>(count_and_size, 0);
  const argv_total_size = load<usize>(count_and_size, sizeof<usize>());

  const argv_ptr_array = new ArrayBuffer(i32((argc + 1) * sizeof<usize>()));
  const argv_total_string = new ArrayBuffer(i32(argv_total_size));
  checkMemory(changetype<usize>(argv_ptr_array) + (argc + 1) * sizeof<usize>());
  checkMemory(changetype<usize>(argv_total_string) + argv_total_size);
  ret = args_get(changetype<usize>(argv_ptr_array), changetype<usize>(argv_total_string));
  perror("args_get");
  for (let i: usize = 0; i < argc; i++) {
    const argv_ptr = load<usize>(changetype<usize>(argv_ptr_array) + i * sizeof<usize>());
    const arg = fromCString(argv_ptr);
    args.push(arg);
  }

  return args;
}

function writeFile(path: string, data: string): void {
  if (data.length == 0) return;
  // open
  const utf8path = String.UTF8.encode(path);
  const fdptr = memory.data(sizeof<fd>());
  checkMemory(changetype<usize>(utf8path) + utf8path.byteLength);
  ret = path_open(
    3,
    lookupflags.SYMLINK_FOLLOW,
    changetype<usize>(utf8path),
    utf8path.byteLength,
    oflags.CREAT | oflags.TRUNC,
    rights.FD_WRITE | rights.FD_SEEK | rights.FD_TELL | rights.FD_FILESTAT_GET | rights.PATH_CREATE_FILE,
    rights.FD_WRITE | rights.FD_SEEK | rights.FD_TELL | rights.FD_FILESTAT_GET | rights.PATH_CREATE_FILE,
    fdflags.SYNC,
    fdptr
  );
  perror("path_open");
  const fileDescriptor: fd = load<fd>(fdptr);

  // write
  const buf = String.UTF8.encode(data);
  const iov = changetype<iovec>(memory.data(sizeof<iovec>()));
  iov.buf = changetype<usize>(buf);
  iov.buf_len = buf.byteLength;
  const written_ptr = memory.data(sizeof<usize>());
  checkMemory(changetype<usize>(buf) + buf.byteLength);
  do {
    ret = fd_write(fileDescriptor, changetype<usize>(iov), 1, written_ptr);
    perror("fd_write");
    iov.buf_len -= load<usize>(written_ptr);
    iov.buf += load<usize>(written_ptr);
  } while (iov.buf_len > 0);
  fd_close(fileDescriptor);
}
