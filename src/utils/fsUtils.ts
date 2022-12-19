import * as fs from 'fs';
import path from 'path';

const makeDirPath: (...arg: string[]) => void = (...arg) => {
  const downPath = path.join(...arg);
  if (!fs.existsSync(downPath)) {
    fs.mkdirSync(downPath, { recursive: true });
  }
};

export { makeDirPath };
