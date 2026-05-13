(async () => {
  const archvieURL = 'https://raw.githubusercontent.com/bangumi/Archive/refs/heads/master/aux/latest.json';
  const data = await (await fetch(archvieURL)).json();
  const dumpURL = data.browser_download_url;
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
