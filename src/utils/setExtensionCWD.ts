import changeVSCodeSetting from "./changeVSCodeSetting";

export default function setCWD() {
  const isCodespace = process.env.CODESPACE === "true";

  changeVSCodeSetting(
    "terminal.integrated.cwd",
    `/home/codespace/${
      isCodespace ? ".vscode-remote" : ".vscode-server"
    }/extensions/zenml.zenml-vscode-quickstart-0.0.1/media/zenml`
  );
}
