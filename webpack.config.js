const FileSystem = require("fs")
const webpack = require("webpack");
const path = require("path");
const glob = require("glob");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const packages = require("./package.json");
const minimize = false;
const licenseText = FileSystem.readFileSync(path.resolve(__dirname, "license.txt"), "utf8");

module.exports = env => {
  return {
    mode: "development",

    entry: (() => {
      const e = {};
      glob.sync("./src/**/*.scss").forEach(v => (e[path.relative("./src", v).replace(/\.scss$/, "")] = path.resolve(__dirname, v)));
      return e;
    })(),

    output: {
      path: path.resolve(__dirname, env.gh ? "build" : "dist", packages.name),
      clean: true
    },

    module: {
      rules: [
        {
          test: /\.scss$/,
          use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
        },
      ],
    },

    plugins: [
      new MiniCssExtractPlugin({
        filename: "[name].css",
      }),

      new webpack.BannerPlugin({ banner: licenseText, entryOnly: true }),

      (function cleanupJsFile() {
        return {
          apply: compiler => {
            compiler.hooks.emit.tapAsync("RemoveJSChunks", (v, cb) => {
              Object.keys(v.assets)
                .filter(n => n.endsWith(".js"))
                .forEach(n => (delete v.assets[n]));
              cb();
            });
          }
        };
      })(),

      (function buildVariant() {
        return {
          apply: compiler => {
            console.log("applied")
            compiler.hooks.done.tap("Generate Variants", (stats) => {
              console.log("running")
              const dist = path.resolve(__dirname, env.gh ? "build" : "dist");
              const themeDirectory = path.join(dist, packages.name);
              const variant = path.resolve(__dirname, "assets");

              if (!FileSystem.existsSync(themeDirectory)) {
                throw new Error("not found theme dist");
              }

              FileSystem.readdirSync(variant, { withFileTypes: true })
                .filter(v => v.isDirectory() && FileSystem.existsSync(path.join(variant, v.name, "css", "colors.css")))
                .forEach(v => {
                  const variantPath = path.join(dist, `${packages.name}-${v.name.toLowerCase().replace(/\s+/g, "-")}`);

                  if (FileSystem.existsSync(variantPath)) {
                    FileSystem.rmSync(variantPath, { recursive: true, force: true });
                  }

                  FileSystem.mkdirSync(variantPath);
                  FileSystem.cpSync(themeDirectory, variantPath, { recursive: true });

                  FileSystem.cpSync(path.join(variant, v.name, "css"), path.join(variantPath, "css"), { recursive: true });

                });
            });
          }
        }
      })()
    ],

    optimization: {
      minimize,
      minimizer: [
        new CssMinimizerPlugin(),
      ],
    },

    resolve: {
      extensions: [
        ".scss"
      ]
    }

  }
};
