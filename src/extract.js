(async () => {
  const archvieURL = 'https://api.github.com/repos/bangumi/Archive/releases/latest';
  const data = await (await fetch(archvieURL)).json();
  const dumpURL = data.assets.pop().browser_download_url;
  const childProcess = require('child_process');
  childProcess.execSync(`wget ${dumpURL} -O dump.zip`, {
    stdio: 'inherit',
  });
  childProcess.execSync('unzip dump.zip -d ./archive', {
    stdio: 'inherit',
  });

  require('./relate');
  require('./check');
  require('./calendar');
})();
