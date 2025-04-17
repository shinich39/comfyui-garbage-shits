import { execSync } from "node:child_process";
import fs from "node:fs";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));

const v = pkg.version;

execSync("npm install --package-lock-only");

const d1 = fs.readFileSync("__init__.py", "utf8").replace(/(\n@version: )([^\n])+/, `$1${v}`);
// console.log(d1);

fs.writeFileSync("__init__.py", d1, "utf8");


const d2 = fs.readFileSync("pyproject.toml", "utf8").replace(/(\nversion = )([^\n])+/, `$1"${v}"`);
// console.log(d2);

fs.writeFileSync("pyproject.toml", d2, "utf8");
