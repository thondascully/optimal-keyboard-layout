from pynput import keyboard
import os

learning_string = "JJJJFFFFJFJF"

active_keys = []

KEYBOARD_ROW_SIZE = [10, 9, 7]
KEYBOARD_MAP = {
    "S": (0, 0),
    "M": (0, 1),
    "N": (0, 2),
    "A": (0, 3),
    "X": (0, 4),
    "Z": (0, 5),
    "U": (0, 6),
    "K": (0, 7),
    "T": (0, 8),
    "I": (0, 9),

    "L": (1, 0),
    "H": (1, 1),
    "G": (1, 2),
    "E": (1, 3),
    "Q": (1, 4),
    "P": (1, 5),
    "R": (1, 6),
    "C": (1, 7),
    "O": (1, 8),

    "J": (2, 0),
    "B": (2, 1),
    "F": (2, 2),
    "Y": (2, 3),
    "V": (2, 4),
    "D": (2, 5),
    "W": (2, 6)
}

kb = [['-' for i in range(KEYBOARD_ROW_SIZE[j])]
                         for j in range(len(KEYBOARD_ROW_SIZE))]

def print_space(size) -> None:
    print('   ' + ' ' * size, end="")

def print_key(key) -> None:
    print(f' {key} ', end="")

def print_keyboard() -> None:
    print("\n")
    for row in range(len(kb)):
        print_space(row)
        for key in kb[row]:
            print_key(key)
        print("")
    print("\n")

def show(char: str) -> None:
    tuple = KEYBOARD_MAP[char]
    active_keys.append(tuple)
    row = tuple[0]
    col = tuple[1]
    kb[row][col] = char

def clear_all() -> None:
    for char in active_keys:
        row = char[0]
        col = char[1]
        kb[row][col] = '-'

print("\n")

def new(next) -> None:
    os.system('clear')
    clear_all()
    show(learning_string[next])
    print_keyboard()

# ------------------------------- LEARNING MODULE ------------------------------- #

next = 0
new(next)

def on_press(key):
    global next
    if key.char == learning_string[next].lower():
        next += 1
        new(next)
    else:
        print()

listener = keyboard.Listener(on_press=on_press)
listener.start()

while(1):
    pass