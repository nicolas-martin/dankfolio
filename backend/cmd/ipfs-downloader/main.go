package main

import (
    "flag"
    "fmt"
    "io"
    "log"
    "os"
    "path/filepath"

    shell "github.com/ipfs/go-ipfs-api"
)

func main() {
    // Command-line flags
    apiURL := flag.String("api", "localhost:5001", "IPFS API address (host:port)")
    outDir := flag.String("out", "./ipfs-cache", "Output directory for cached files")
    cid := flag.String("cid", "", "IPFS CID to fetch")
    flag.Parse()

    if *cid == "" {
        log.Fatal("Usage: ipfs-downloader --cid <CID> [--api host:port] [--out <dir>]")
    }

    // Ensure output directory exists
    if err := os.MkdirAll(*outDir, 0755); err != nil {
        log.Fatalf("Error creating out dir: %v", err)
    }

    // Prepare IPFS shell
    sh := shell.NewShell(*apiURL)

    // File paths
    tmpPath := filepath.Join(*outDir, *cid+".tmp")
    outPath := filepath.Join(*outDir, *cid)

    // Skip if already exists
    if _, err := os.Stat(outPath); err == nil {
        fmt.Printf("CID %s already cached at %s\n", *cid, outPath)
        return
    }

    // Fetch from IPFS
    reader, err := sh.Cat(*cid)
    if err != nil {
        log.Fatalf("IPFS fetch error: %v", err)
    }
    defer reader.Close()

    // Create temp file
    f, err := os.Create(tmpPath)
    if err != nil {
        log.Fatalf("Error creating temp file: %v", err)
    }

    // Write data
    if _, err := io.Copy(f, reader); err != nil {
        f.Close()
        os.Remove(tmpPath)
        log.Fatalf("Error writing file: %v", err)
    }
    f.Close()

    // Atomic rename
    if err := os.Rename(tmpPath, outPath); err != nil {
        log.Fatalf("Error renaming file: %v", err)
    }

    fmt.Printf("Successfully cached CID %s at %s\n", *cid, outPath)
}
