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

KEYBOARD_ROW_SIZE = [10, 9, 7]
contiguous_count = {}

class Keyboard:
    __slots__ = 'keyboard'
    keyboard: typing.List[typing.List]

    def __init__(self) -> None:
        self.keyboard = [['-' for i in range(KEYBOARD_ROW_SIZE[j])] for j in range(len(KEYBOARD_ROW_SIZE))] 
    
    def print_space(self, size) -> None:
        print(' ' * size, end = "")
    
    def print_key(self, key) -> None:
        print(f' {key} ', end = "")
    
    def print_newline(self) -> None:
        print("")
    
    def print(self) -> str:
        self.print_newline()
        for row in range(len(self.keyboard)):
            self.print_space(row)
            for key in self.keyboard[row]:
                self.print_key(key)
            self.print_newline()
        self.print_newline()

def populate_contiguous_count():
    alpha = "abcdefghijklmnopqrstuvwxyz"
    for first in alpha:
        for second in alpha:
            contiguous_count[first + second] = 0

if __name__ == '__main__':
    keyboard = Keyboard()
    keyboard.print()
    populate_contiguous_count()

    for word in parse_pdf.get_words()[:10]:
        length = len(word)            
        for index in range(length - 1):
            print(word[index] + word[index + 1])