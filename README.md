<p align="center">
  <a href="#" target="_blank" rel="noopener noreferrer">
    <img src="./public/Banner.png" alt="avacx_banner" />
  </a>
</p>

## Overview
HAWKNET is a cutting-edge, open-source, cross-platform desktop application designed to provide users with a seamless experience in managing and interacting with various AI models. Built using Tauri and Rust, Hawknet offers a lightweight and efficient solution for developers and enthusiasts looking to harness the power of AI in their workflows.

>LEGAL NOTICE: HAWKNET is intended for security research and penetration testing purposes only. Use it responsibly and ethically.We are not liable for any misuse or damage caused by the tool. Read full legal disclaimer in [LEGAL](/.guidebook/legal.md).

## HAWKNET in Action

<div align="center">
<table>
<tr>
<td><img src="./public/A1.png" alt="Screenshot 1" width="100%"/></td>
<td><img src="./public/A2.png" alt="Screenshot 2" width="100%"/></td>
</tr>
<tr>
<td><img src="./public/A3.png" alt="Screenshot 3" width="100%"/></td>
<td><img src="./public/A4.png" alt="Screenshot 4" width="100%"/></td>
</tr>
</table>
</div>


## Getting Started

Copy environment
```
cp ./src-tauri/.env.example ./src-tauri/.env
```

```
# 1. Install dependencies
pnpm install

# 2. Start the development server
pnpm tauri dev
```

## Before Reconnaissance Scan

```
cd data_fetch

go run main.go
```