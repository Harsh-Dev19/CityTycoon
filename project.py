"""
City Tycoon (mini) - single file
A small grid-based city simulation made with pygame.

Features:
- Grid placement of 4 building types
- Money, population, happiness, energy systems
- Income tick every second
- Save / Load to JSON
- Simple UI and basic balancing

Author: ChatGPT (adapted for you)
"""

import pygame
import sys
import json
import os
import time
from dataclasses import dataclass, asdict

# ------ Config ------
CELL = 64
GRID_W, GRID_H = 10, 7
UI_WIDTH = 300
WIDTH = GRID_W * CELL + UI_WIDTH
HEIGHT = GRID_H * CELL
FPS = 60
SAVE_FILE = "city_tycoon_save.json"

# Colors
WHITE = (245, 245, 245)
BLACK = (20, 20, 20)
GRAY = (110, 110, 110)
LIGHT_GRAY = (200, 200, 200)
GREEN = (60, 180, 75)
DARK_GREEN = (40, 120, 50)
RED = (220, 60, 60)
YELLOW = (240, 200, 40)
BLUE = (70, 130, 220)
BROWN = (140, 90, 50)
ORANGE = (255, 165, 0)

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("City Tycoon (mini)")
clock = pygame.time.Clock()
FONT = pygame.font.SysFont("consolas", 18)
BIG = pygame.font.SysFont("consolas", 28, bold=True)

# ------ Game Data ------
@dataclass
class BuildingDef:
    id: int
    name: str
    cost: int
    upkeep: int  # per tick cost (could be 0)
    income: int  # base income per tick
    pop: int     # population contribution
    energy: int  # energy produced (positive) or required (negative)
    happiness: float  # happiness delta (can be negative)

BUILDINGS = [
    BuildingDef(1, "House",    cost=100, upkeep=0,   income=2,  pop=2,  energy=-1, happiness=0.05),
    BuildingDef(2, "Shop",     cost=200, upkeep=1,   income=8,  pop=0,  energy=-2, happiness=0.02),
    BuildingDef(3, "Farm",     cost=150, upkeep=0,   income=3,  pop=0,  energy=0,  happiness=0.03),
    BuildingDef(4, "PowerPlant",cost=400, upkeep=2,  income=0,  pop=0,  energy=8,  happiness=-0.12),
]
BUILDING_BY_ID = {b.id: b for b in BUILDINGS}

@dataclass
class PlacedBuilding:
    bid: int
    x: int
    y: int
    placed_at: float

    def to_json(self):
        return asdict(self)

    @staticmethod
    def from_json(d):
        return PlacedBuilding(d["bid"], d["x"], d["y"], d["placed_at"])

# ------ Game State ------
class City:
    def __init__(self):
        self.money = 500
        self.population = 0
        self.happiness = 0.6  # 0..1
        self.energy = 0
        self.grid = [[None for _ in range(GRID_H)] for _ in range(GRID_W)]
        self.buildings = []  # list of PlacedBuilding
        self.tick_accum = 0.0
        self.tick_interval = 1.0  # seconds
        self.running = True
        self.selected_building = 1
        self.last_tick_time = time.time()

    def can_place(self, gx, gy):
        if not (0 <= gx < GRID_W and 0 <= gy < GRID_H):
            return False
        return self.grid[gx][gy] is None

    def place(self, bx, by, bid):
        if not (0 <= bx < GRID_W and 0 <= by < GRID_H):
            return False, "Out of bounds"
        if self.grid[bx][by] is not None:
            return False, "Cell occupied"
        bdef = BUILDING_BY_ID[bid]
        if self.money < bdef.cost:
            return False, "Not enough money"
        self.money -= bdef.cost
        pb = PlacedBuilding(bid, bx, by, time.time())
        self.buildings.append(pb)
        self.grid[bx][by] = pb
        # apply immediate static effects
        self.population += bdef.pop
        self.energy += bdef.energy
        self.happiness = clamp(self.happiness + bdef.happiness * 0.5, 0.0, 1.0)
        return True, "Placed"

    def demolish(self, bx, by):
        if not (0 <= bx < GRID_W and 0 <= by < GRID_H):
            return False, "Out of bounds"
        pb = self.grid[bx][by]
        if pb is None:
            return False, "Empty"
        bdef = BUILDING_BY_ID[pb.bid]
        refund = int(bdef.cost * 0.5)
        self.money += refund
        # remove effects
        self.population -= bdef.pop
        self.energy -= bdef.energy
        self.happiness = clamp(self.happiness - bdef.happiness * 0.5, 0.0, 1.0)
        self.buildings.remove(pb)
        self.grid[bx][by] = None
        return True, f"Demolished (+${refund})"

    def tick(self):
        # Called every tick_interval
        total_income = 0
        total_upkeep = 0
        produced_energy = 0
        req_energy = 0
        pop_from_houses = 0

        for pb in self.buildings:
            b = BUILDING_BY_ID[pb.bid]
            if b.energy > 0:
                produced_energy += b.energy
            elif b.energy < 0:
                req_energy += -b.energy
            total_income += b.income
            total_upkeep += b.upkeep
            pop_from_houses += b.pop

        # population already tracked on place/demolish; ensure it's non-negative
        self.population = max(0, self.population)

        # energy usage/availability
        self.energy = produced_energy - req_energy

        # happiness drifts slightly toward an equilibrium affected by city
        # Basic rules: more population slightly reduces happiness; powerplants reduce it
        pop_effect = clamp(0.02 - (self.population * 0.001), -0.3, 0.05)
        energy_effect = 0.05 if self.energy >= 0 else -0.12
        # small random-ish charm avoided to keep deterministic
        self.happiness = clamp(self.happiness + pop_effect + energy_effect * 0.02, 0.0, 1.0)

        # income multiplier based on happiness and energy
        happiness_mult = 0.8 + self.happiness * 0.8   # 0.8..1.6
        energy_mult = 1.0 if self.energy >= 0 else 0.6

        # population affects some businesses: shops require population to be efficient
        pop_bonus = 1.0 + min(self.population / 50.0, 0.5)  # up to +50%

        gained = int((total_income - total_upkeep) * happiness_mult * energy_mult * pop_bonus)
        gained = max(-50, gained)  # clamp losses
        self.money += gained

        # small passive population growth if houses are present and happiness good
        if pop_from_houses > 0 and self.happiness > 0.5:
            growth = int(pop_from_houses * 0.02)
            self.population += growth

        return {
            "income_base": total_income,
            "upkeep": total_upkeep,
            "gained": gained,
            "energy": self.energy,
            "pop": self.population,
            "happiness": self.happiness,
        }

    def reset(self):
        self.__init__()

    def save(self, filename=SAVE_FILE):
        try:
            data = {
                "money": self.money,
                "population": self.population,
                "happiness": self.happiness,
                "buildings": [pb.to_json() for pb in self.buildings],
            }
            with open(filename, "w") as f:
                json.dump(data, f, indent=2)
            return True, "Saved"
        except Exception as e:
            return False, str(e)

    def load(self, filename=SAVE_FILE):
        if not os.path.exists(filename):
            return False, "Save not found"
        try:
            with open(filename, "r") as f:
                data = json.load(f)
            self.money = int(data.get("money", 0))
            self.population = int(data.get("population", 0))
            self.happiness = float(data.get("happiness", 0.6))
            # clear grid
            self.grid = [[None for _ in range(GRID_H)] for _ in range(GRID_W)]
            self.buildings = []
            for bd in data.get("buildings", []):
                pb = PlacedBuilding.from_json(bd)
                self.buildings.append(pb)
                if 0 <= pb.x < GRID_W and 0 <= pb.y < GRID_H:
                    self.grid[pb.x][pb.y] = pb
            # recalc energy and pop (in case)
            self.energy = sum(BUILDING_BY_ID[pb.bid].energy for pb in self.buildings)
            return True, "Loaded"
        except Exception as e:
            return False, str(e)

def clamp(v, a, b):
    return max(a, min(b, v))

# ------ Rendering helpers ------
def draw_text(surf, text, pos, font=FONT, color=WHITE):
    txt = font.render(text, True, color)
    surf.blit(txt, pos)

def draw_building_icon(surf, rect, bid):
    b = BUILDING_BY_ID[bid]
    # simple icon: colored rect + initial
    color = {
        1: GREEN,
        2: ORANGE,
        3: BROWN,
        4: GRAY
    }[bid]
    inner = rect.inflate(-8, -8)
    pygame.draw.rect(surf, color, inner)
    initial = BIG.render(b.name[0], True, BLACK)
    ic = initial.get_rect(center=inner.center)
    surf.blit(initial, ic)

# ------ Main Loop ------
def main():
    city = City()
    last_ui_message = ""
    ui_message_timer = 0.0

    running = True
    last_time = time.time()
    tick_accum = 0.0

    while running:
        dt = clock.tick(FPS) / 1000.0
        now = time.time()
        tick_dt = now - last_time
        last_time = now
        if city.running:
            city.tick_accum += tick_dt

        # events
        for e in pygame.event.get():
            if e.type == pygame.QUIT:
                running = False
            elif e.type == pygame.KEYDOWN:
                if e.key == pygame.K_ESCAPE:
                    running = False
                elif e.key == pygame.K_SPACE:
                    city.running = not city.running
                elif e.key == pygame.K_s:
                    ok, msg = city.save()
                    last_ui_message = msg
                    ui_message_timer = 2.0
                elif e.key == pygame.K_l:
                    ok, msg = city.load()
                    last_ui_message = msg
                    ui_message_timer = 2.0
                elif e.key == pygame.K_r:
                    city.reset()
                elif e.key in (pygame.K_1, pygame.K_KP1):
                    city.selected_building = 1
                elif e.key in (pygame.K_2, pygame.K_KP2):
                    city.selected_building = 2
                elif e.key in (pygame.K_3, pygame.K_KP3):
                    city.selected_building = 3
                elif e.key in (pygame.K_4, pygame.K_KP4):
                    city.selected_building = 4
            elif e.type == pygame.MOUSEBUTTONDOWN:
                mx, my = pygame.mouse.get_pos()
                gx = mx // CELL
                gy = my // CELL
                if mx < GRID_W * CELL and my < GRID_H * CELL:
                    if e.button == 1:  # left click - place
                        ok, msg = city.place(gx, gy, city.selected_building)
                        last_ui_message = msg
                        ui_message_timer = 2.0
                    elif e.button == 3:  # right click - demolish
                        ok, msg = city.demolish(gx, gy)
                        last_ui_message = msg
                        ui_message_timer = 2.0

        # ticks
        if city.running:
            while city.tick_accum >= city.tick_interval:
                info = city.tick()
                city.tick_accum -= city.tick_interval
                # show brief feedback
                last_ui_message = f"+${info['gained']}  pop:{info['pop']}  E:{info['energy']}"
                ui_message_timer = 2.0

        # render
        screen.fill((30, 30, 36))

        # Draw grid background
        for x in range(GRID_W):
            for y in range(GRID_H):
                rect = pygame.Rect(x * CELL, y * CELL, CELL, CELL)
                pygame.draw.rect(screen, (40, 40, 48), rect)
                pygame.draw.rect(screen, (28, 28, 34), rect.inflate(-6, -6))
                pygame.draw.rect(screen, (60, 60, 70), rect, 1)

        # Draw buildings
        for pb in city.buildings:
            rect = pygame.Rect(pb.x * CELL, pb.y * CELL, CELL, CELL)
            draw_building_icon(screen, rect, pb.bid)

        # Draw grid hover / preview
        mx, my = pygame.mouse.get_pos()
        gx = mx // CELL
        gy = my // CELL
        if mx < GRID_W * CELL and my < GRID_H * CELL:
            preview_rect = pygame.Rect(gx * CELL + 2, gy * CELL + 2, CELL - 4, CELL - 4)
            pygame.draw.rect(screen, (255, 255, 255, 40), preview_rect, 2)
            # cost preview
            bdef = BUILDING_BY_ID[city.selected_building]
            cost_color = GREEN if city.money >= bdef.cost and city.can_place(gx, gy) else RED
            draw_text(screen, f"{bdef.name} (${bdef.cost})", (10, HEIGHT - 70), color=WHITE)

        # UI panel
        ui_x = GRID_W * CELL
        ui_rect = pygame.Rect(ui_x, 0, UI_WIDTH, HEIGHT)
        pygame.draw.rect(screen, (22, 22, 28), ui_rect)
        pygame.draw.line(screen, (60, 60, 70), (ui_x, 0), (ui_x, HEIGHT), 2)

        # Top stats
        draw_text(screen, "City Tycoon (mini)", (ui_x + 12, 12), font=BIG, color=YELLOW)
        draw_text(screen, f"Money: ${city.money}", (ui_x + 12, 50))
        draw_text(screen, f"Population: {city.population}", (ui_x + 12, 74))
        draw_text(screen, f"Happiness: {int(city.happiness*100)}%", (ui_x + 12, 98))
        energy_color = GREEN if city.energy >= 0 else RED
        draw_text(screen, f"Energy: {city.energy}", (ui_x + 12, 122), color=energy_color)

        # Controls/help
        draw_text(screen, "Controls:", (ui_x + 12, 160), font=BIG)
        draw_text(screen, "LMB: Place   RMB: Demolish", (ui_x + 12, 188))
        draw_text(screen, "1-4: Select building", (ui_x + 12, 208))
        draw_text(screen, "Space: Pause/Resume", (ui_x + 12, 228))
        draw_text(screen, "S: Save  L: Load  R: Reset", (ui_x + 12, 248))

        # Building buttons
        bx = ui_x + 12
        by = 290
        for b in BUILDINGS:
            brect = pygame.Rect(bx, by, UI_WIDTH - 24, 48)
            pygame.draw.rect(screen, (40, 40, 50), brect)
            if city.selected_building == b.id:
                pygame.draw.rect(screen, BLUE, brect, 3)
            # name + cost
            draw_text(screen, f"{b.id}. {b.name}  (${b.cost})", (bx + 8, by + 6))
            draw_text(screen, f"Income: {b.income}/s  Pop:+{b.pop}  E:{b.energy}", (bx + 8, by + 28), font=pygame.font.SysFont("consolas", 14))
            by += 58

        # UI message
        if ui_message_timer > 0 and last_ui_message:
            draw_text(screen, last_ui_message, (ui_x + 12, HEIGHT - 30), color=WHITE)
            ui_message_timer -= dt
        else:
            # draw small tip
            draw_text(screen, "Tip: Houses give population; Shops need customers.", (ui_x + 12, HEIGHT - 30), color=LIGHT_GRAY)

        # small status at bottom left for selected build
        b = BUILDING_BY_ID[city.selected_building]
        draw_text(screen, f"Selected: {b.name}  Cost: ${b.cost}", (8, HEIGHT - 24), color=WHITE)

        pygame.display.flip()

    pygame.quit()
    sys.exit()

if __name__ == "__main__":
    main()
