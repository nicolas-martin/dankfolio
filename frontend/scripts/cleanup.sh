#!/bin/bash

# Read the depcheck output from a file or stdin
# Usage: ./cleanup.sh < depcheck-output.txt

unused_deps=()
unused_dev_deps=()

while read -r line; do
  if [[ $line == \* ]]; then
    pkg=$(echo "$line" | cut -d'*' -f2 | xargs)
    if [[ $in_unused == true ]]; then
      unused_deps+=("$pkg")
    elif [[ $in_unused_dev == true ]]; then
      unused_dev_deps+=("$pkg")
    fi
  elif [[ $line == "Unused dependencies"* ]]; then
    in_unused=true
    in_unused_dev=false
  elif [[ $line == "Unused devDependencies"* ]]; then
    in_unused=false
    in_unused_dev=true
  elif [[ $line == "Missing dependencies"* ]]; then
    break
  fi
done

if [[ ${#unused_deps[@]} -gt 0 ]]; then
  echo "Removing unused dependencies:"
  echo "${unused_deps[@]}"
  yarn remove "${unused_deps[@]}"
fi

if [[ ${#unused_dev_deps[@]} -gt 0 ]]; then
  echo "Removing unused devDependencies:"
  echo "${unused_dev_deps[@]}"
  yarn remove --dev "${unused_dev_deps[@]}"
fi
