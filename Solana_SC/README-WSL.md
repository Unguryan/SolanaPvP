# Установка Solana и Anchor в WSL

## Быстрый старт

1. **Откройте WSL (Ubuntu) терминал**

2. **Запустите скрипт установки:**

   ```bash
   cd /mnt/f/VS/SolanaPvP/Solana_SC
   bash setup-wsl.sh
   ```

3. **Перейдите в папку проекта:**

   ```bash
   cd /mnt/f/VS/SolanaPvP/Solana_SC
   ```

4. **Соберите проект:**
   ```bash
   export HOME=$HOME
   anchor build
   ```

## Доступ к файлам Windows из WSL

Файлы Windows доступны через `/mnt/`:

- `F:\` → `/mnt/f/`
- `C:\` → `/mnt/c/`

Ваш проект находится в: `/mnt/f/VS/SolanaPvP/Solana_SC`

## Работа с VS Code

Если используете VS Code:

1. Установите расширение "WSL"
2. Откройте папку проекта в WSL
3. Все команды будут выполняться в WSL окружении

## Полезные команды

```bash
# Проверка версий
rustc --version
solana --version
anchor --version

# Сборка проекта
RIBIR export HOME=$HOME
anchor build

# Тесты
anchor test

# Развертывание
anchor deploy
```

## Решение проблем

Если `anchor` не найден после установки:

```bash
source ~/.bashrc
export PATH="$HOME/.cargo/bin:$PATH"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
```
