"use strict";

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const www = path.join(root, "www");

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });
const copyFile = (src, dest) => fs.copyFileSync(src, dest);
const copyDir = (src, dest) => fs.cpSync(src, dest, { recursive: true, force: true });

ensureDir(www);

const htmlFiles = fs.readdirSync(root).filter((file) => file.endsWith(".html"));
htmlFiles.forEach((file) => copyFile(path.join(root, file), path.join(www, file)));

["manifest.json", "service-worker.js"].forEach((file) => {
  const src = path.join(root, file);
  if (fs.existsSync(src)) copyFile(src, path.join(www, file));
});

["css", "js", "assets", "icons"].forEach((dir) => {
  const src = path.join(root, dir);
  if (fs.existsSync(src)) copyDir(src, path.join(www, dir));
});

console.log("Web assets copied to www/");
