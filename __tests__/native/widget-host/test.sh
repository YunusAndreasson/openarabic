#!/usr/bin/env bash
# Arguments: compiled Expo Widgets classes, Kotlin stdlib, coroutines, android.jar.
set -eu
src=$(cd "$(dirname "$0")" && pwd)
out=$(mktemp -d)
trap 'rm -rf "$out"' EXIT
cp="$1:$2:$3:$4"
mapfile -d '' sources < <(find "$src" -name '*.java' -print0)
javac -d "$out" -cp "$cp" "${sources[@]}"
cd "$out"
for mode in legacy revoke; do
  java -cp "$out:$cp" Host "$mode"
  expected=private
  if [[ $mode == revoke ]]; then expected=public; fi
  for id in 1 2; do [[ $(cat "instance-$id") == "$expected" ]]; done
done
echo 'Host retained public RemoteViews for both instances after process death'
for token in "" replacement old; do
  java -cp "$out:$cp" LateHost "$token"
done
echo 'Delayed composition passed for revoked, replaced, and matching generations'
java -cp "$out:$cp" RevealHost
echo 'Instance-local reveal, duplicate taps, word, generation and due boundaries passed'
java -cp "$out:$cp" CallbackHost
echo 'Cold broadcast and deadline delivery redrew only the tapped widget'
