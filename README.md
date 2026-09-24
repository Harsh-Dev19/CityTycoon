<div align="center">

# ◈ CITY TYCOON

### SIMULATION • STRATEGY • JAVASCRIPT

**Build your city. Manage its resources. Keep it growing.**

<br>

<img src="https://img.shields.io/badge/HTML5-0D0D0D?style=for-the-badge&logo=html5&logoColor=9FE3C1" />
<img src="https://img.shields.io/badge/CSS3-0D0D0D?style=for-the-badge&logo=css3&logoColor=C77D8A" />
<img src="https://img.shields.io/badge/JAVASCRIPT-0D0D0D?style=for-the-badge&logo=javascript&logoColor=9FE3C1" />
<img src="https://img.shields.io/badge/CANVAS-0D0D0D?style=for-the-badge&logoColor=C77D8A" />

<br><br>

</div>

---

# ◈ OVERVIEW

**City Tycoon** is a browser-based city simulation game built with HTML, CSS, and JavaScript.

The player starts with a limited amount of money and builds a city by placing different types of buildings on a grid.

Each building affects the city's:

- Money
- Population
- Happiness
- Energy
- Income
- Upkeep

The city updates continuously through a game tick system, creating a simple resource-management and simulation loop.

---

# ◈ FEATURES

### 🏙️ City Building

Place buildings on a **10 × 7 grid** and gradually expand your city.

### 🏠 Multiple Building Types

| Building | Cost | Income | Population | Energy |
|---|---:|---:|---:|---:|
| 🏠 House | $100 | +$2/s | +2 | -1 |
| 🏬 Shop | $200 | +$8/s | +0 | -2 |
| 🌾 Farm | $150 | +$3/s | +0 | 0 |
| ⚡ Power Plant | $400 | +$0/s | +0 | +8 |

Buildings also have different happiness and upkeep effects.

### 💰 Economy System

Buildings generate income and some buildings require upkeep.

The amount earned each game tick is affected by:

- Happiness
- Energy availability
- Population
- Building income
- Building upkeep

### ⚡ Energy Management

Buildings can either produce or consume energy.

Power Plants generate energy while Houses and Shops consume it.

A negative energy balance reduces the city's economic performance and happiness.

### 😊 Happiness System

Happiness changes based on population and energy conditions.

It also influences how much money the city generates.

### 👥 Population

Houses increase population, while population growth can occur when the city's happiness remains sufficiently high.

### 🖱️ Building & Demolition

Use:

- **Left Click** to place buildings
- **Right Click** to demolish buildings

Demolishing a building returns **50% of its original cost**.

### 💾 Save & Load

City progress can be saved and restored using the browser's **localStorage**.

### ⏸️ Pause & Resume

The simulation can be paused and resumed through the UI or keyboard.

### 🔄 Reset

Reset the entire city and return to the initial starting state.

---

# ◈ COMMANDS

| Key / Input | Action |
|---|---|
| `Left Click` | Place selected building |
| `Right Click` | Demolish building |
| `1` | Select House |
| `2` | Select Shop |
| `3` | Select Farm |
| `4` | Select Power Plant |
| `Space` | Pause / Resume |
| `S` | Save |
| `L` | Load |
| `R` | Reset |

---

# ◈ HOW IT WORKS

~~~text
             CITY
               │
               ▼
        BUILDINGS PLACED
               │
               ▼
      INCOME / UPKEEP
               │
        ┌──────┴──────┐
        ▼             ▼
     ENERGY       POPULATION
        │             │
        └──────┬──────┘
               ▼
          HAPPINESS
               │
               ▼
        ECONOMIC OUTPUT
               │
               ▼
          NEXT TICK
~~~

The simulation runs on a **one-second game tick**.

Each tick calculates:

- Building income
- Building upkeep
- Energy production
- Energy requirements
- Happiness changes
- Population growth
- Final money gained or lost

---

# ◈ GAME MECHANICS

### 💰 Money

The city begins with:

~~~text
$500
~~~

Money is spent when placing buildings and earned through the city's income system.

### ⚡ Energy

Energy is calculated from the buildings currently placed in the city.

~~~text
Energy Produced - Energy Required = Current Energy
~~~

If energy becomes negative, the city's economic multiplier is reduced.

### 😊 Happiness

Happiness is represented as a percentage in the interface.

It is influenced by:

- Population
- Energy balance
- Building placement
- Building removal

### 💵 Income

Each building contributes its own income and upkeep values.

The final income is modified by:

- Happiness
- Energy availability
- Population

---

# ◈ BUILDING SYSTEM

City Tycoon currently contains four building types.

### 🏠 House

~~~text
Cost:       $100
Income:     +$2/s
Population: +2
Energy:     -1
Happiness:  +0.05
~~~

### 🏬 Shop

~~~text
Cost:       $200
Income:     +$8/s
Upkeep:     $1
Population: +0
Energy:     -2
Happiness:  +0.02
~~~

### 🌾 Farm

~~~text
Cost:       $150
Income:     +$3/s
Population: +0
Energy:      0
Happiness:  +0.03
~~~

### ⚡ Power Plant

~~~text
Cost:       $400
Income:      $0/s
Upkeep:      $2
Population:  +0
Energy:      +8
Happiness:  -0.12
~~~

---

# ◈ TECHNOLOGY

### FRONTEND

`HTML5` · `CSS3`

### GAME LOGIC

`JavaScript`

### GRAPHICS

`HTML Canvas`

### STORAGE

`Browser localStorage`

### BROWSER APIs

`Canvas API` · `DOM API` · `localStorage`

---

# ◈ PROJECT STRUCTURE

~~~text
CityTycoon/
│
├── index.html
├── style.css
├── app.js
└── README.md
~~~

### `index.html`

Contains the game's interface, controls, statistics panel, building panel, and canvas.

### `style.css`

Handles the game's dark interface, layout, cards, building controls, responsive design, and visual styling.

### `app.js`

Contains the game state, building definitions, simulation logic, rendering system, controls, save/load system, and game loop.

---

# ◈ RUN LOCALLY

### 1. Clone the repository

~~~bash
git clone https://github.com/Harsh-Dev19/CityTycoon.git
cd CityTycoon
~~~

### 2. Open the game

Open:

~~~text
index.html
~~~

in a modern web browser.

No package installation or build process is required.

---

# ◈ GAME CONTROLS

### Mouse

~~~text
Left Click   → Place selected building
Right Click  → Demolish building
~~~

### Keyboard

~~~text
1 → House
2 → Shop
3 → Farm
4 → Power Plant

Space → Pause / Resume
S     → Save
L     → Load
R     → Reset
~~~

---

# ◈ SAVE SYSTEM

City Tycoon uses the browser's **localStorage** to store the current game state.

The saved state contains information such as:

- Money
- Population
- Happiness
- Placed buildings

The game can restore the saved city using the **Load** button or the `L` key.

---

# ◈ PROJECT HIGHLIGHTS

- Browser-based city simulation
- Grid-based building system
- Multiple building types
- Resource management
- Income and upkeep mechanics
- Population simulation
- Happiness system
- Energy management
- Real-time game ticks
- Canvas-based rendering
- Local save/load system
- Mouse and keyboard controls
- Responsive interface

---

# ◈ CURRENT SCOPE

City Tycoon is currently a lightweight browser-based simulation focused on core city-building and resource-management mechanics.

The main gameplay systems run entirely on the client side.

The JavaScript also contains an experimental state API structure:

~~~text
GET  /state
POST /update
~~~

These functions are separate from the main local gameplay loop.

---

# ◈ FUTURE DIRECTIONS

Possible extensions include:

- More building types
- Larger maps
- Roads and city infrastructure
- More detailed population systems
- Additional resource types
- Events and challenges
- Improved visual effects
- Expanded economic mechanics
- More advanced city progression

---

<div align="center">

### ◈ CITY TYCOON

**BUILD → MANAGE → BALANCE → GROW**

<br>

`HTML` · `CSS` · `JAVASCRIPT` · `CANVAS`

<br><br>

**Harsh Dev**

</div>
