const fs = require("fs");

function deleteMaps(dir) {
  fs.readdir(dir, function (err, files) {
    files.forEach((file) => {
      if (/\.map$/.test(file)) {
        fs.unlinkSync(dir + file);
      } else if (/\.css$/.test(file) || /\.js$/.test(file)) {
        fs.readFile(dir + file, "utf8", (err, data) => {
          fs.writeFileSync(
            dir + file,
            data.replace(/\/\/# sourceMappingURL.*/, "")
          );
        });
      }
    });
  });
}

["./dist/assets/"].map(deleteMaps);
