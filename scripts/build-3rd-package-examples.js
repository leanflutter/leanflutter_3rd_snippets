const fs = require(`fs`);
const execSync = require("child_process").execSync;
const YAML = require("yaml");
const Git = require("nodegit");
const cliProgress = require("cli-progress");

const cwd = `${process.cwd()}`;

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
  // Git.ProxyOptions = {
  //   type: Git.Proxy.PROXY.AUTO,
  // };
  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    for (let j = 0; j < (provider.packages || []).length; j++) {
      const package = provider.packages[j];
      console.log(package);

      let repoUrl = `${provider.homepage}/${package.name}`;
      let repoLocalPath = `${cwd}/build/3rd_package_examples/${provider.name}/${package.name}`;
      if (package.repository) {
        repoUrl = package.repository.url;
      }

      const examplePath = `${repoLocalPath}/example`;

      if (!fs.existsSync(`${repoLocalPath}/.git`)) {
        execSync(`rm -rf ${repoLocalPath}`);
        // create new progress bar
        const b1 = new cliProgress.SingleBar({
          format:
            "CLI Progress |" +
            "{bar}" +
            "| {percentage}% || {value}/{total} Chunks || Speed: {speed}",
          barCompleteChar: "\u2588",
          barIncompleteChar: "\u2591",
          hideCursor: true,
        });
        var totalObjects = 0;
        console.log(
          `git clone --depth 1 ${repoUrl.replace(
            "https://",
            "https://gitclone.com/"
          )} ${repoLocalPath}`
        );
        execSync(
          `git clone --depth 1 ${repoUrl.replace(
            "https://",
            "https://gitclone.com/"
          )} ${repoLocalPath}`
        );
        // await Git.Clone(
        //   repoUrl.replace("https://", "https://gitclone.com/"),
        //   repoLocalPath,
        //   {
        //     fetchOpts: {
        //       callbacks: {
        //         transferProgress: (progress) => {
        //           if (totalObjects == 0) {
        //             totalObjects = progress.totalObjects();
        //             b1.start(totalObjects, 0, {
        //               speed: "N/A",
        //             });
        //           }
        //           // console.log(totalObjects);
        //           // console.log(progress.receivedObjects());
        //           b1.update(progress.receivedObjects());
        //         },
        //       },
        //     },
        //   }
        // );
        b1.stop();
        // } else {
        //   // create new progress bar
        //   const b1 = new cliProgress.SingleBar({
        //     format:
        //       "CLI Progress |" +
        //       "{bar}" +
        //       "| {percentage}% || {value}/{total} Chunks || Speed: {speed}",
        //     barCompleteChar: "\u2588",
        //     barIncompleteChar: "\u2591",
        //     hideCursor: true,
        //   });
        //   var totalObjects = 0;
        //   const repository = await Git.Repository.open(repoLocalPath);
        //   await repository.fetchAll({
        //     callbacks: {
        //       transferProgress: (progress) => {
        //         // var p = Object.keys(progress.__proto__).map((k) =>
        //         //   // console.log(`${k}: ${progress[k]()}`)
        //         // );
        //         if (totalObjects == 0) {
        //           totalObjects = progress.totalObjects();
        //           b1.start(totalObjects, 0, {
        //             speed: "N/A",
        //           });
        //         }
        //         // console.log(totalObjects);
        //         // console.log(progress.receivedObjects());
        //         b1.update(progress.receivedObjects());
        //       },
        //     },
        //   });
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
          `flutter build web --profile`,
          `cd ${cwd}`,
        ];
        execSync(commands.join(" && "));

        if (fs.existsSync(`${examplePath}/build/web`)) {
          const outputPath = `${cwd}/output/3rd_package_examples/${package.name}`;

          execSync(`rm -rf ${outputPath}`);
          execSync(`cp -R ${examplePath}/build/web ${outputPath}`);
        }
      } catch (e) {
        console.log(e);
        // skip package
      }
    }
  }
};

build();
