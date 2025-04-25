#!/bin/bash

unused_deps=(
  "@bufbuild/protoc-gen-es"
  "@emotion/native"
  "@emotion/react"
  "@expo/vector-icons"
  "@solana/spl-token"
  "@types/styled-components-react-native"
  "buffer"
  "cheerio"
  "expo-clipboard"
  "expo-dev-client"
  "expo-linear-gradient"
  "expo-secure-store"
  "lucide-react-native"
  "prop-types"
  "react-native-chart-kit"
  "react-native-get-random-values"
  "react-native-paper-dropdown"
  "react-native-paper-toast"
  "react-native-screens"
  "react-native-skia"
  "react-native-svg"
  "react-native-svg-charts"
  "react-native-url-polyfill"
  "react-native-web"
  "tweetnacl"
)

unused_dev_deps=(
  "@react-native-community/cli"
  "@tsconfig/react-native"
  "@types/color"
  "@types/react-native-svg-charts"
  "@types/victory"
  "react-native-dotenv"
  "rpc-websockets"
)

echo "Removing unused dependencies..."
yarn remove "${unused_deps[@]}"
# npm uninstall "${unused_deps[@]}"

echo "Removing unused devDependencies..."
yarn remove --dev "${unused_dev_deps[@]}"
# npm uninstall --save-dev "${unused_dev_deps[@]}"

echo "Done."

