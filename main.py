"""
Teo Honda-Scully | 2022
"""

import typing
import parse_pdf
import operator
import time
import os

alpha = "abcdefghijklmnopqrstuvwxyz"
DIGRAPH_GROUP_ACCT_AMT = 5
KEYBOARD_ROW_SIZE = [10, 9, 7]
KEYBOARD_PSUM_ROWS = []
FINGER_TAGS = ["L5", "L4", "L3", "L2", "L1", "R1", "R2", "R3", "R4", "R5"]
qwerty_key_pair = {}
QWERTY_KEY_COMFORT_ORDER = ['F', 'J', 'E', 'O', 'A', 'P', 'M', 'L', 'I', 'Q',
                            'R', 'K', 'U', 'H', 'W', 'N', 'S', 'D', 'T', 'C', 'G', 'V', 'Y', 'B', 'X', 'Z']
qwerty_key_status = 0
fingers = {}
contiguous_count = {}
frequency_letter = {}

fail_time = 3
fail_time_less = 1.5
assign_time = 0.75

os.system("clear")

class Key:
    __slots__ = ['letter', 'row', 'column', 'qwerty_key']
    letter: chr
    qwerty_key: chr
    row: int
    column: int

    def __init__(self, id, row, column) -> None:
        self.letter = id
        self.row = row
        self.column = column

    def get_qkey(self) -> chr:
        return self.qwerty_key


class Keyboard:
    __slots__ = 'keyboard'
    keyboard: typing.List[typing.List[chr]]

    def __init__(self) -> None:
        self.keyboard = [[Key('-', j, i) for i in range(KEYBOARD_ROW_SIZE[j])]
                         for j in range(len(KEYBOARD_ROW_SIZE))]

    def contains(self, char) -> bool:
        for row in self.keyboard:
            for key in row:
                if key.letter == char:
                    return True
        return False

    def print_space(self, size) -> None:
        print(' ' * size, end="")

    def print_key(self, key) -> None:
        print(f' {key} ', end="")

    def print_newline(self) -> None:
        print("")

    # Prints keyboard layout (what would be qwertyuiop \n asdfghjkl \n zxcvbnm)
    # Rows are determined by KEYBOARD_ROW_SIZE iter on init
    # If (is_raw), do not print indents that reflect a realistic keyboard.
    def print(self, is_raw) -> None:
        self.print_newline()
        for row in range(len(self.keyboard)):
            if not is_raw:
                self.print_space(row)
            for key in self.keyboard[row]:
                self.print_key(key.letter)
            self.print_newline()
        self.print_newline()


class Finger:
    __slots__ = ['id', 'keys']
    id: str
    keys: typing.List[chr]

    def __init__(self, id) -> None:
        self.id = id
        self.keys = []

    def assign(self, *keys: Key) -> None:
        if keys == None:
            return
        for key in keys:
            self.keys.append(key)

    def get_key_row(self, index) -> int:
        return self.keys[index].row

    def get_key_column(self, index) -> int:
        return self.keys[index].column

    def contains(self, char) -> bool:
        for key in self.keys:
            if key.letter == char:
                return True
        return False

# Modified prefix sum. Takes [10, 9, 7] and returns [0, 10, 19]. Normal psum would return [10, 19, 26]
def get_modified_rows():
    new = [0] * (len(KEYBOARD_ROW_SIZE))
    new[1] = KEYBOARD_ROW_SIZE[0]
    for index in list(range(1, len(KEYBOARD_ROW_SIZE) - 1)):
        new[index + 1] = new[index] + KEYBOARD_ROW_SIZE[index]
    return new

def fold_iter(seq, init, gen):
    for item in seq:
        init = gen(init, item)
        yield init

def get_modified_rows2():
    return list(fold_iter([0] + KEYBOARD_ROW_SIZE[:2], 0, operator.add))

# Creates a map of 26^2 keys. Keys range from 'aa' -> 'ab' -> ... -> 'zy' -> 'zz'. Value is zero atm
def populate_contiguous_count():
    for first in alpha:
        for second in alpha:
            contiguous_count[first + second] = 0


def populate_frequency_letter():
    for letter in alpha:
        frequency_letter[letter] = 0


def populate_hands():
    for finger in FINGER_TAGS:
        fingers[finger] = Finger(finger)


def populate_qwerty_pairing():
    qwerty = "qwertyuiopasdfghjklzxcvbnm"
    row: int
    for letter in qwerty:
        column: int
        ind = qwerty.index(letter)
        for size in list(reversed(KEYBOARD_PSUM_ROWS)):
            if ind + 1 > size:
                row = KEYBOARD_PSUM_ROWS.index(size)
                column = size
                break
        qwerty_key_pair[letter.upper()] = (
            row, ind - (column))

def print_keyboard(keyboard: Keyboard, ms, message, var):
    os.system("clear")
    keyboard.print(0)
    if message != "":
        print(message % var.upper())
    time.sleep(ms)

def get_finger(qwerty_key: str) -> Finger:
    row = qwerty_key_pair[qwerty_key][0]
    column = qwerty_key_pair[qwerty_key][1]
    for finger in fingers.values():
        if not finger.keys[0]: 
            continue
        for key in finger.keys:
            if (key.row == row and key.column == column):
                return finger

# Ugly, but necessary :( assigns each key to its respective comfort finger


def assign_keys(keyboard: Keyboard.keyboard, fingers: typing.List[Finger]):
    fingers["L5"].assign(None)
    fingers["L4"].assign(keyboard[0][0], keyboard[1][0], keyboard[2][0])
    fingers["L3"].assign(keyboard[0][1], keyboard[0][2], keyboard[1][1])
    fingers["L2"].assign(keyboard[0][3], keyboard[0][4], keyboard[1][2], keyboard[1]
                         [3], keyboard[1][4], keyboard[2][1], keyboard[2][2], keyboard[2][3])
    fingers["L1"].assign(None)
    fingers["R1"].assign(None)
    fingers["R2"].assign(keyboard[0][5], keyboard[0][6], keyboard[1][5], keyboard[1]
                         [6], keyboard[1][7], keyboard[2][4], keyboard[2][5], keyboard[2][6])
    fingers["R3"].assign(keyboard[0][7], keyboard[0][8], keyboard[1][8])
    fingers["R4"].assign(keyboard[0][9])
    fingers["R5"].assign(None)

# ------------------------------------------------------------------------------------------------- #


KEYBOARD_PSUM_ROWS = get_modified_rows()
populate_contiguous_count()
populate_frequency_letter()
populate_hands()
populate_qwerty_pairing()

# Every time a specific set of two contiguous characters pop up while iterating through a word in
# raw_pdf_top_2000.txt, ++ the frequency count in contiguous_count map according to respective key
# EX: "hello" contains "he". Increase the count (value) of "he" key in the contiguous_count map by 1
for word in parse_pdf.get_words():
    length = len(word)
    for index in range(length - 1):
        contiguous_count[word[index] + word[index + 1]] += 1

# Sorts the map by digraph frequency and removes all keys whose value is 0
contiguous_count = {k: v for k, v in {k: v for k, v in sorted(
    contiguous_count.items(), key=lambda item: item[1])}.items() if v != 0}

keyboard = Keyboard()
assign_keys(keyboard.keyboard, fingers)

inv_q_pair = {v: k for k, v in qwerty_key_pair.items()}
for row in keyboard.keyboard:
    for key in row:
        key.qwerty_key = inv_q_pair[tuple(
            map(int, [key.row, key.column]))]  # LOL

# Adds 1 to frequency_letter[letter] for every occurrence of letter in every digraph
for digraph in contiguous_count.keys():
    for letter in digraph:
        frequency_letter[letter] += contiguous_count[digraph]

ordered_keys = list(reversed({k: v for k, v in sorted(
    frequency_letter.items(), key=lambda item: item[1])}.keys()))

for key in ordered_keys:
    if (keyboard.contains(key.upper())):
        print_keyboard(keyboard, fail_time_less, "trying key '%s', but it is already in the keyboard", key)
        continue

    # Example: 'E' is most frequent. 'E' should now be assigned to the 'F' slot,
    # as the 'F' QWERTY key is the most comfortable (subjective).
    # The 'F' QWERTY key exists at qwerty_key_pair['F'] point, which is (1, 3). Therefore,
    # the new 'E' key will get assigned to keyboard.keyboard[1][3]. This process repeats,
    # except that if a finger (in this case, L2 is assigned to (1,3)) is already assigned to
    # a key that is a common pair with the current iterated key, it moves to the next option. Tada!

    letter = QWERTY_KEY_COMFORT_ORDER[qwerty_key_status % 26]
    row = qwerty_key_pair[letter][0]
    column = qwerty_key_pair[letter][1]
    count = 0
    while keyboard.keyboard[row][column].letter != "-":
        print("trying to assign '%s' to the %s key, but key is taken" % (key.upper(), letter))
        time.sleep(fail_time_less)
        count += 1
        qwerty_key_status += 1 # Linear probing
        # If the QWERTY key is already assigned to a key, move to the next most comfortable QWERTY key.

        letter = QWERTY_KEY_COMFORT_ORDER[qwerty_key_status % 26]
        row = qwerty_key_pair[letter][0]
        column = qwerty_key_pair[letter][1]

    other_chars_in_common_digraphs = []
    for digraph in list(reversed(list(filter(lambda digraph: digraph.__contains__(key), contiguous_count.keys()))))[:DIGRAPH_GROUP_ACCT_AMT]:
        other_chars_in_common_digraphs.append(digraph.replace(key, ""))

    while (1):
        if not get_finger(key.upper()):
            # This is reached if the qwerty key has not been assigned to any character yet.
            break

        for k in get_finger(QWERTY_KEY_COMFORT_ORDER[qwerty_key_status % 26]).keys:
            if k.letter.lower() not in other_chars_in_common_digraphs:
                break
            else:
                # This is reached if the current key's common neighbors have been assigned to the same qwerty key in question.
                # Therefore we ++ qks (move to next comfort key) and try again.
                qwerty_key_status += 1
                continue
            # Technically, this loop should not end naturally. If it ends naturally, it means no available
            # spot was open. If this happens, we instead want to assign the primary next comfort qwerty key to the key

        break
    # If this is reached, then the qwerty key (qwerty_key_status) has not been assigned to a common neighbor
    # of the iteration key.

    keyboard.keyboard[row][column].letter = key.upper()
    print_keyboard(keyboard, 0, "", "")
    print("assigned key '%s' to the %s key" % (key.upper(), letter))
    time.sleep(assign_time)

    for char in other_chars_in_common_digraphs:
        if char == '':
            continue
        if keyboard.contains(char.upper()):
            continue

        qwerty_key_status += 1  # Linear probing
        next_key = QWERTY_KEY_COMFORT_ORDER[qwerty_key_status % 26]
        nkey = qwerty_key_pair[next_key]

        neighbor_other_chars_in_common_digraphs = []
        for digraph in list(reversed(list(filter(lambda digraph: digraph.__contains__(char), contiguous_count.keys()))))[:DIGRAPH_GROUP_ACCT_AMT]:
            neighbor_other_chars_in_common_digraphs.append(digraph.replace(char, ""))

        while (1):
            if not get_finger(char.upper()):
                break

            if keyboard.keyboard[nkey[0]][nkey[1]].letter != "-":
                print("trying to assign '%s' to the %s key, but key is taken" % (char.upper(), next_key))
                time.sleep(fail_time_less)
                qwerty_key_status += 1
                continue

            for k in get_finger(QWERTY_KEY_COMFORT_ORDER[qwerty_key_status % 26]).keys:
                if k.letter != "-":
                    if k.letter.lower() not in neighbor_other_chars_in_common_digraphs:
                        break
                    else:
                        print("trying to assign '%s' to the %s key, but %s's common neighbor already owns this finger" % (char.upper(), next_key, char.upper()))
                        time.sleep(fail_time)
                        qwerty_key_status += 1

            break

        next_key = QWERTY_KEY_COMFORT_ORDER[qwerty_key_status % 26]
        nkey = qwerty_key_pair[next_key]
        keyboard.keyboard[nkey[0]][nkey[1]].letter = char.upper()

        print_keyboard(keyboard, 0, "", "")
        print("assigned key '%s' to the %s key" % (char.upper(), next_key))
        time.sleep(assign_time)

    qwerty_key_status += 1

#print_keyboard(keyboard)