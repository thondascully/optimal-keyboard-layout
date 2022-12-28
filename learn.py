learning_string = "jjjjffffjfjf"

KEYBOARD_ROW_SIZE = [10, 9, 7]
KEYBOARD_MAP = {
    (0, 0): "S",
    (0, 1): "M",
    (0, 2): "N",
    (0, 3): "A",
    (0, 4): "X",
    (0, 5): "Z",
    (0, 6): "U",
    (0, 7): "K",
    (0, 8): "T",
    (0, 9): "I",

    (1, 0): "L",
    (1, 1): "H",
    (1, 2): "G",
    (1, 3): "E",
    (1, 4): "Q",
    (1, 5): "P",
    (1, 6): "R",
    (1, 7): "C",
    (1, 8): "O",

    (2, 0): "J",
    (2, 1): "B",
    (2, 2): "F",
    (2, 3): "Y",
    (2, 4): "V",
    (2, 5): "D",
    (2, 6): "W",
}

keyboard = [['-' for i in range(KEYBOARD_ROW_SIZE[j])]
                         for j in range(len(KEYBOARD_ROW_SIZE))]

def print_space(size) -> None:
    print(' ' * size, end="")

def print_key(key) -> None:
    print(f' {key} ', end="")

def print_keyboard() -> None:
    for row in range(len(keyboard)):
        print_space(row)
        for key in keyboard[row]:
            print_key(key)
        print("\n")

def show(char: tuple) -> None:
    row = char[0]
    col = char[1]
    keyboard[row][col] = KEYBOARD_MAP[char]

show((1, 3))
print_keyboard()
