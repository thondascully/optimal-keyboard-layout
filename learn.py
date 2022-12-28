learning_string = "jjjjffffjfjf"

KEYBOARD_ROW_SIZE = [10, 9, 7]

keyboard = [['-' for i in range(KEYBOARD_ROW_SIZE[j])]
                         for j in range(len(KEYBOARD_ROW_SIZE))]

def print_space(size) -> None:
    print(' ' * size, end="")

def print_key(key) -> None:
    print(f' {key} ', end="")

def print_newline() -> None:
    print("")

def print_keyboard() -> None:
    print_newline()
    for row in range(len(keyboard)):
        print_space(row)
        for key in keyboard[row]:
            print_key(key.letter)
        print_newline()
    print_newline()

