# Текущие проблемы - 05.11.2025

## 1. При присоединении показывает кошелек вместо username

**Проблема:** В команде на Match Preview показывается кошелек (AdJe...cXvn) вместо username (user_483785)

**Логи:**

```
Team 2 (1/1)
AdJe...cXvn  // ❌ Показывает кошелек
You
```

**Ожидается:**

```
Team 2 (1/1)
user_483785  // ✅ Должен показывать username
You
```

**Локация проблемы:**

- `MatchPreview.tsx` - отображение команд (Team 1 / Team 2)
- Нужно использовать `username` из `participant`, а не показывать truncated pubkey

---

## 2. Создатель лобби может присоединиться к Team 2, но UI некорректен

**Проблема:**

- Юзер создает лобби и присоединяется к **Team 2** (side: 1) - это OK
- Но на UI он отображается в **Team 1**, и кнопка "Join Team 2" выключена

**Ожидается:**

- Если creator выбрал side: 1, он должен быть в Team 2 на UI
- Кнопка "Join Team 1" должна быть активна для других игроков

**Локация проблемы:**

- `MatchPreview.tsx` - логика отображения команд `getTeam1Players()` / `getTeam2Players()`
- Проверка `side` для creator при создании

---

## 3. Для других игроков reveal показывает 0 поинтов

**Проблема:**

- Текущий игрок (ты) видит свои действия
- Но AI/другие игроки при reveal показывают `currentScore: 0` вместо реального счета

**Ожидается:**

- AI должны автоматически выбирать карты
- При reveal должен показываться правильный `currentScore` (сумма выбранных карт)

**Логи:**

```
shouldHideScores(user_200941): isScoreRevealed=false, shouldHide=true
[Real Game] Current player: user_483785 AdJeQDaZ...
[Real Game] AI opponents: ['user_200941']
Setting up timers for 1 AI players in Solo mode
```

**Локация проблемы:**

- `UniversalGameBoard.tsx` - логика AI таймеров и auto-selection
- Возможно AI таймеры не срабатывают или не обновляют `currentScore`

---

## 4. Игрок набирает неправильные очки (0 вместо реальных)

**Проблема:**

- Backend генерирует `targetScore: 1476` и карты со значениями ~100-300
- Игрок выбирает карту (например, 183)
- Но `currentScore` остается **0** вместо 183

**Ожидается:**

- При клике на карту: `currentScore += tileValue` (183)
- Должен показываться накопленный счет, а не 0

**Логи:**

```
[MatchPreview] Backend gameData: {gameMode: '1x3', side0TotalScore: 1476, side1TotalScore: 1330}
Players:
  - user_200941: targetScore: 1476, currentScore: 0
  - user_483785: targetScore: 1330, currentScore: 0  // ❌ Должно быть 183 после выбора
```

**Возможная причина:**

- `shouldHideScores()` возвращает `true` для текущего игрока
- `isScoreRevealed` некорректно устанавливается
- Проверка `currentPlayerPubkey` не срабатывает

**Локация проблемы:**

- `UniversalGameBoard.tsx` - `handleTileClick()` не обновляет state
- `shouldHideScores()` - возвращает `true` для текущего игрока
- `isScoreRevealed` инициализация

---

## Дополнительная информация

### Логика работы (как должно быть):

1. Игрок создает лобби, выбирает side (0 или 1)
2. Второй игрок присоединяется
3. Backend генерирует `targetScore` для каждой команды и карты
4. Игроки выбирают карты, `currentScore` увеличивается
5. После времени/всех выборов - reveal, показываются все счета
6. Команда ближе к `targetScore` выигрывает

### Текущая проблема:

- `currentScore` всегда 0
- `isScoreRevealed` = false даже для текущего игрока
- UI показывает `???` вместо счета

---

## План на завтра:

1. Исправить отображение username вместо pubkey в командах
2. Исправить логику отображения создателя в правильной команде
3. Исправить AI auto-selection и обновление их счета
4. Исправить обновление `currentScore` для текущего игрока при клике на карту
5. Исправить `shouldHideScores()` и `isScoreRevealed` логику
6. Протестировать полный flow: создание -> присоединение -> игра -> reveal -> результаты
