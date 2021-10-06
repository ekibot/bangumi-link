yarn install
node spider.js
cd data
git config --local user.email "soekibun+bot@gmail.com"
git config --local user.name "ekibot"
tim=$(date "+%Y%m%d%H%M%S")
cd data
git add . -v
git commit -m "Update at $time"
git push
