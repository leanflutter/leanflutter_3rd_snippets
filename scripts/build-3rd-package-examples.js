const fs = require(`fs`);
const execSync = require("child_process").execSync;
const YAML = require("yaml");

const cwd = `${process.cwd()}`;
const flutterDevPath = process.env.FLUTTER_DEV_PATH;

if (!fs.existsSync(`${cwd}/build`)) {
  fs.mkdirSync(`${cwd}/build`);
  fs.mkdirSync(`${cwd}/build/3rd_package_examples`);
}
if (!fs.existsSync(`${cwd}/output`)) {
  fs.mkdirSync(`${cwd}/output`);
  fs.mkdirSync(`${cwd}/output/3rd_package_examples`);
}

let filePaths = fs
  .readdirSync(`${cwd}/db/providers`)
  .map((v) => `${cwd}/db/providers/${v}`)
  .filter((v) => !fs.lstatSync(v).isDirectory());

const providers = [];

for (let j = 0; j < filePaths.length; j++) {
  const filePath = filePaths[j];
  if (!filePath.includes(".yml")) continue;

  let text = fs.readFileSync(filePath).toString();
  let provider = YAML.parse(text);

  providers.push({
    slug: filePath.replace(/^.*[\\\/]/, "").replace(".yml", ""),
    ...provider,
  });
}

const build = async () => {
  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    for (let j = 0; j < (provider.packages || []).length; j++) {
      const package = provider.packages[j];
      console.log(package.name);

      let repoUrl = `https://github.com/${provider.name}/${package.name}`;
      let repoLocalPath = `${cwd}/build/3rd_package_examples/${provider.name}/${package.name}`;
      if (package.repository) {
        repoUrl = package.repository.url;
      }

      const examplePath = `${repoLocalPath}/example`;

      if (!fs.existsSync(`${repoLocalPath}/.git`)) {
        execSync(`rm -rf ${repoLocalPath}`);
        execSync(
          `git clone --depth 1 ${repoUrl.replace(
            "https://",
            "https://gitclone.com/"
          )} ${repoLocalPath}`
        );
      }

      const outputPath = `${cwd}/output/3rd_package_examples/${package.name}`;
      if (fs.existsSync(outputPath)) {
        console.log(`Skip ${package.name}`);
        continue;
      }

      try {
        console.log("Buiding...");
        if (!fs.existsSync(`${examplePath}/web`)) {
          fs.mkdirSync(`${examplePath}/web`);
          const indexHtml =
            `<!DOCTYPE html>` +
            `<html>` +
            `  <head>` +
            `    <meta charset="UTF-8" />` +
            `    <title>${package.name} example</title>` +
            `  </head>` +
            `  <body>` +
            `    <script src="main.dart.js" type="application/javascript"></script>` +
            `  </body>` +
            `</html>`;
          try {
            fs.writeFileSync(
              `${examplePath}/web/index.html`,
              indexHtml,
              "utf8"
            );
          } catch (e) {
            console.log("first error");
            console.log(e);
          }
        }

        const commands = [
          `cd ${examplePath}`,
          `${flutterDevPath}/bin/flutter build web --profile`,
          `cd ${cwd}`,
        ];
        execSync(commands.join(" && "));

        if (fs.existsSync(`${examplePath}/build/web`)) {
          execSync(`rm -rf ${outputPath}`);
          execSync(`cp -R ${examplePath}/build/web ${outputPath}`);

          fs.writeFileSync(
            `${outputPath}/.last_build_time`,
            `${new Date().getTime()}`,
            "utf8"
          );
        }
      } catch (e) {
        console.log(e);
        // skip package
      }
    }
  }
};

build();
