echo "load archive ..."

rm dump.zip
wget https://github.com/bangumi/Archive/releases/download/archive/dump.zip

rm -rf ./archive
unzip dump.zip -d ./archive

echo "fetch data ..."

rm -rf ./data
git clone --depth 1 https://${GH_TOKEN}@github.com/ekibot/bangumi-link.git data

echo "extracting ..."

yarn install
yarn add bangumi-data@latest
node src/extract.js

echo "commit change ..."

cd data
git config --local user.email "soekibun+bot@gmail.com"
git config --local user.name "ekibot"
time=$(date "+%Y%m%d%H%M%S")
git add . -v
git commit -m "Update at $time"
git push
