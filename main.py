"""
Prints out the keyboard layout in which every key is as far away 
from its most common neighbor (hello, h and e are neighbors),
accounting for the top 2000 words in the english language 

To some extent, you want the keycap of each letter in a 
word to be far away from the neighboring letters

My passwords are typically 'beacon' or 'shadow' because every 
letter is typed using a different finger (or avoids the 
same finger usage for 2-3 letters in a row), meaning it can 
be typed in pretty much minimal keystroke time

With dvorak, there is no guarantee (and it is almost uncommon) 
for different fingers to be used for each neighboring letter 
of an english word. This layout is what qwerty attempted to do, 
but definitely is not perfect. Another solution would be to 
include an easily accessible key on the keyboard that repeats 
the last letter typed. Therefore, words like 'hello' can be typed 
without using the same finger for both 'l's

Teo Honda-Scully | 2022
"""

import typing
import parse_pdf

alpha = "abcdefghijklmnopqrstuvwxyz"
DIGRAPH_GROUP_ACCT_AMT = 5
KEYBOARD_ROW_SIZE = [10, 9, 7]
KEYBOARD_PSUM_ROWS = []
FINGER_TAGS = ["L5", "L4", "L3", "L2", "L1", "R1", "R2", "R3", "R4", "R5"]
qwerty_key_pair = {}
QWERTY_KEY_COMFORT_ORDER = ['F', 'J', 'E', 'O', 'A', 'P', 'M', 'L', 'I', 'Q', 'R', 'K', 'U', 'H', 'W', 'N', 'S', 'D', 'T', 'C', 'G', 'V', 'Y', 'B', 'X', 'Z']
qwerty_key_status = 0
fingers = {}
contiguous_count = {}
frequency_letter = {}

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
        self.keyboard = [[Key('-', j, i) for i in range(KEYBOARD_ROW_SIZE[j])] for j in range(len(KEYBOARD_ROW_SIZE))] 

    def contains(self, char) -> bool:
        for row in self.keyboard:
            for key in row:
                if key.letter == char:
                    return True
        return False

    def print_space(self, size) -> None:
        print(' ' * size, end = "")
    
    def print_key(self, key) -> None:
        print(f' {key} ', end = "")
    
    def print_newline(self) -> None:
        print("")
    
    # Prints keyboard layout (what would be qwertyuiop \n asdfghjkl \n zxcvbnm)
    # Rows are determined by KEYBOARD_ROW_SIZE iter on init
    # If (is_raw), do not print indents that reflect a realistic keyboard.
    def print(self, is_raw) -> None:
        self.print_newline()
        for row in range(len(self.keyboard)):
            if (not is_raw): 
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

    def assign(self, key: Key) -> None:
        if (key == None): return
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
        for size in list(reversed(KEYBOARD_PSUM_ROWS)):
            if qwerty.index(letter) + 1 > size:
                row = KEYBOARD_PSUM_ROWS.index(size)
                column = size
                break
        qwerty_key_pair[letter.upper()] = (row, qwerty.index(letter) - (column))

def get_finger(qwerty_key: str) -> Finger:
    row = qwerty_key_pair[qwerty_key][0]
    column = qwerty_key_pair[qwerty_key][1]
    for finger in fingers.values():
        for key in finger.keys:
            if (key.row == row and key.column == column):
                return finger

# Ugly, but necessary :( assigns each key to its respective comfort finger
def assign_keys(keyboard: Keyboard.keyboard, fingers: typing.List[Finger]):
    fingers["L5"].assign(None)
    
    fingers["L4"].assign(keyboard[0][0])
    fingers["L4"].assign(keyboard[1][0])
    fingers["L4"].assign(keyboard[2][0])

    fingers["L3"].assign(keyboard[0][1])
    fingers["L3"].assign(keyboard[0][2])
    fingers["L3"].assign(keyboard[1][1])
    
    fingers["L2"].assign(keyboard[0][3])
    fingers["L2"].assign(keyboard[0][4])
    fingers["L2"].assign(keyboard[1][2])
    fingers["L2"].assign(keyboard[1][3])
    fingers["L2"].assign(keyboard[1][4])
    fingers["L2"].assign(keyboard[2][1])
    fingers["L2"].assign(keyboard[2][2])
    fingers["L2"].assign(keyboard[2][3])

    fingers["L1"].assign(None)

    fingers["R1"].assign(None)

    fingers["R2"].assign(keyboard[0][5])
    fingers["R2"].assign(keyboard[0][6])
    fingers["R2"].assign(keyboard[1][5])
    fingers["R2"].assign(keyboard[1][6])
    fingers["R2"].assign(keyboard[1][7])
    fingers["R2"].assign(keyboard[2][4])
    fingers["R2"].assign(keyboard[2][5])
    fingers["R2"].assign(keyboard[2][6])

    fingers["R3"].assign(keyboard[0][7])
    fingers["R3"].assign(keyboard[0][8])
    fingers["R3"].assign(keyboard[1][8])

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
contiguous_count = {k: v for k, v in {k: v for k, v in sorted(contiguous_count.items(), key=lambda item: item[1])}.items() if v!=0}

keyboard = Keyboard()
assign_keys(keyboard.keyboard, fingers)

inv_q_pair = {v: k for k, v in qwerty_key_pair.items()}
for row in keyboard.keyboard:
    for key in row:
        key.qwerty_key = inv_q_pair[tuple(map(int, [key.row, key.column]))] # LOL

# Adds 1 to frequency_letter[letter] for every occurrence of letter in every digraph
for digraph in contiguous_count.keys():
    for letter in digraph:
        frequency_letter[letter] += contiguous_count[digraph]

ordered_keys = list(reversed({k: v for k, v in sorted(frequency_letter.items(), key=lambda item: item[1])}.keys()))

for key in ordered_keys:
    # Example: 'E' is most frequent. 'E' should now be assigned to the 'F' slot, 
    # as the 'F' QWERTY key is the most comfortable (subjective). 
    # The 'F' QWERTY key exists at qwerty_key_pair['F'] point, which is (1, 3). Therefore,
    # the new 'E' key will get assigned to keyboard.keyboard[1][3]. This process repeats,
    # except that if a finger (in this case, L2 is assigned to (1,3)) is already assigned to
    # a key that is a common pair with the current iterated key, it moves to the next option. Tada!
    letter = QWERTY_KEY_COMFORT_ORDER[qwerty_key_status % 26]
    row = qwerty_key_pair[letter][0]
    column = qwerty_key_pair[letter][1]
    while keyboard.keyboard[row][column].letter != "-":
        qwerty_key_status += 1 # Linear probing
        letter = QWERTY_KEY_COMFORT_ORDER[qwerty_key_status % 26]
        row = qwerty_key_pair[letter][0]
        column = qwerty_key_pair[letter][1]

    if not keyboard.contains(key.upper()):
        keyboard.keyboard[row][column].letter = key.upper()
        print(f'{letter} is being set to {key.upper()}')

    other_chars_in_common_digraphs = []
    for digraph in list(reversed(list(filter(lambda digraph: digraph.__contains__(key), contiguous_count.keys()))))[:DIGRAPH_GROUP_ACCT_AMT]:
        other_chars_in_common_digraphs.append(digraph.replace(key, ""))

    for char in other_chars_in_common_digraphs:
        if char == '':
            continue
        if keyboard.contains(char.upper()):
            continue 
        qwerty_key_status += 1 # Linear probing

        next_key = QWERTY_KEY_COMFORT_ORDER[qwerty_key_status % 26]
        l = qwerty_key_pair[next_key]
        if keyboard.keyboard[l[0]][l[1]].letter == "-":
            keyboard.keyboard[l[0]][l[1]].letter = char.upper()
            print(f'{next_key} is being set to {char.upper()}')

    qwerty_key_status += 1
keyboard.print(0)

# Prints assigned finger diagram
"""
for finger in fingers.values():
    print(f'\n{finger.id} | ', end="")
    for key in finger.keys:
        print(key.letter, end="")
print("\n")
"""