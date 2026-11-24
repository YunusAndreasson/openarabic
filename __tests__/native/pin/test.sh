#!/usr/bin/env bash
# Supply the compiled word-widget Kotlin classes and the Kotlin stdlib jar.
set -eu
src=$(dirname "$0")
out=$(mktemp -d)
trap 'rm -rf "$out"' EXIT
javac -d "$out" -cp "$1:$2" "$src"/android/{app,appwidget,content,os}/*.java "$src"/Pin.java
java -cp "$out:$1:$2" Pin
