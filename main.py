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
KEYBOARD_ROW_SIZE = [10, 9, 7]
contiguous_count = {}
frequency_letter = {}

class Key:
    __slots__ = 'letter'
    letter: chr

    def __init__(self, id) -> None:
        self.letter = id

class Keyboard:
    __slots__ = 'keyboard'
    keyboard: typing.List[typing.List[chr]]

    def __init__(self) -> None:
        self.keyboard = [[Key('-') for i in range(KEYBOARD_ROW_SIZE[j])] for j in range(len(KEYBOARD_ROW_SIZE))] 

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
    __slots__ = 'id'
    id: str

    def __init__(self, id) -> None:
        self.id = id

    def list(self) -> None:
        pass

# Creates a map of 26^2 keys. Keys range from 'aa' -> 'ab' -> ... -> 'zy' -> 'zz'. Value is zero atm
def populate_contiguous_count():
    for first in alpha:
        for second in alpha:
            contiguous_count[first + second] = 0

def populate_frequency_letter():
    for letter in alpha:
        frequency_letter[letter] = 0

if __name__ == '__main__':
    populate_contiguous_count()
    populate_frequency_letter()

    # Every time a specific set of two contiguous characters pop up while iterating through a word in
    # raw_pdf_top_2000.txt, ++ the frequency count in contiguous_count map according to respective key
    # EX: "hello" contains "he". Increase the count (value) of "he" key in the contiguous_count map by 1
    for word in parse_pdf.get_words():
        length = len(word)        
        for index in range(length - 1):
            contiguous_count[word[index] + word[index + 1]] += 1
            #print(f'{word} | {word[index] + word[index + 1]}')

    # Sorts the map by digraph frequency and removes all keys whose value is 0
    contiguous_count = {k: v for k, v in {k: v for k, v in sorted(contiguous_count.items(), key=lambda item: item[1])}.items() if v!=0}

    keyboard = Keyboard()
    keyboard.print(0)

