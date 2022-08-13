# rm dump.zip
# wget https://github.com/bangumi/Archive/releases/download/archive/dump.zip

rm -r ./archive
unzip dump.zip -d ./archive

cd data
git pull
cd ..
yarn install
node src/extract.js
cd data
git config --local user.email "soekibun+bot@gmail.com"
git config --local user.name "ekibot"
time=$(date "+%Y%m%d%H%M%S")
git add . -v
git commit -m "Update at $time"
git push
