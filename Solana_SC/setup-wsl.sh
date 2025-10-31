#!/bin/bash
# Установка Solana и Anchor в WSL
# Запустите: bash setup-wsl.sh в WSL терминале

set -e

echo "========================================"
echo "Установка Solana и Anchor в WSL"
echo "========================================"
echo ""

# 1. Обновление системы
echo "[1/7] Обновление системы..."
sudo apt update && sudo apt upgrade -y

# 2. Установка зависимостей
echo "[2/7] Установка зависимостей..."
sudo apt install -y build-essential curl file git pkg-config libudev-dev libssl-dev

# 3. Установка Rust
echo "[3/7] Установка Rust..."
if ! command -v rustc &> /dev/null; then
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
else
    echo "  Rust уже установлен"
    rustup update stable
fi

# 4. Установка Solana (Agave)
echo "[4/7] Установка Solana (Agave)..."
if ! command -v solana &> /dev/null; then
    sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
    echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
else
    echo "  Solana уже установлен"
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
fi

# 5. Установка Anchor Version Manager
echo "[5/7] Установка AVM (Anchor Version Manager)..."
if ! command -v avm &> /dev/null; then
    cargo install --git https://github.com/coral-xyz/anchor avm --force
    export PATH="$HOME/.cargo/bin:$PATH"
    echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.bashrc
else
    echo "  AVM уже установлен"
    export PATH="$HOME/.cargo/bin:$PATH"
fi

# 6. Установка Anchor 0.31.0
echo "[6/7] Установка Anchor 0.31.0..."
avm install 0.31.0
avm use 0.31.0

# 7. Проверка установки
echo "[7/7] Проверка установки..."
source ~/.bashrc
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
export PATH="$HOME/.cargo/bin:$PATH"

echo ""
echo "========================================"
echo "Установка завершена!"
echo "========================================"
echo ""
rustc --version
solana --version
anchor --version
echo ""
echo "Следующие шаги:"
echo "1. Перейдите в папку проекта Windows из WSL:"
echo "   cd /mnt/f/VS/SolanaPvP/Solana_SC"
echo ""
echo "2. Соберите проект:"
echo "   export HOME=\$HOME"
echo "   anchor build"
echo ""

