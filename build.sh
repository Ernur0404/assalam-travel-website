#!/usr/bin/env bash
# Собирает две цели из src/:
#   public/index.html     — сайт для хостинга (рядом лежит public/assets)
#   .build/artifact.html  — сборка для превью-ссылки
#
# Всё, что уезжает на хостинг, лежит в public/. Vercel при пустом
# Output Directory сам берёт эту папку, поэтому src/, README и CONTENT.md
# в интернет не попадают.
set -e
cd "$(dirname "$0")"
mkdir -p .build public

SITE=public/index.html

# --- сайт ---
{
  cat src/head.html
  cat src/body.html
  printf '\n<script src="assets/js/i18n.js"></script>\n<script src="assets/js/main.js"></script>\n</body>\n</html>\n'
} > "$SITE"

# --- артефакт: те же ассеты, свой <head> ---
{
  cat src/artifact-head.html
  cat src/body.html
  printf '\n<script src="assets/js/i18n.js"></script>\n<script src="assets/js/main.js"></script>\n'
} > .build/artifact.html

for f in "$SITE" .build/artifact.html; do
  printf '%-24s %s KB\n' "$f" "$(( $(wc -c < "$f") / 1024 ))"
done

# --- проверка: все ли ключи переведены ---
used=$(mktemp); have=$(mktemp)
{ grep -o 'data-i18n="[^"]*"' "$SITE" | sed 's/data-i18n="//;s/"//'
  grep -o 'data-i18n-ph="[^"]*"' "$SITE" | sed 's/data-i18n-ph="//;s/"//;s/^/ph./'
  grep -o 'data-i18n-alt="[^"]*"' "$SITE" | sed 's/data-i18n-alt="//;s/"//'
} | sort -u > "$used"
grep -oE "^\s+'[A-Za-z0-9._]+'\s*:" public/assets/js/i18n.js | sed "s/[' :]//g" | sort -u > "$have"
missing=$(comm -23 "$used" "$have")
if [ -n "$missing" ]; then
  printf 'НЕТ ПЕРЕВОДА (%s):\n%s\n' "$(echo "$missing" | wc -l)" "$missing"
else
  printf 'переводы: все %s ключей на месте\n' "$(wc -l < "$used")"
fi
rm -f "$used" "$have"

# --- проверка: все ли картинки существуют ---
miss=0
for p in $(grep -oE "(assets/img/[A-Za-z0-9._/-]+)" "$SITE" public/assets/css/styles.css | sed 's/^[^:]*://' | sort -u); do
  [ -f "public/$p" ] || { echo "НЕТ ФАЙЛА: public/$p"; miss=1; }
done
for p in $(grep -oE "\.\./img/[A-Za-z0-9._-]+" public/assets/css/styles.css | sed 's|\.\./img/|assets/img/|' | sort -u); do
  [ -f "public/$p" ] || { echo "НЕТ ФАЙЛА: public/$p"; miss=1; }
done
[ "$miss" = 0 ] && echo "картинки: все на месте"
