# optimal keyboard layout: how to maximize typing speed by maximizing finger diversity

> this program accounts for the user's natural finger positioning, the keys that each finger is in charge of, and the keys that the user feels most comfortable pressing. [click here](#how-to-maximize-typing-speed-by-maximizing-finger-diversity-using-the-aforementioned-typing-patterns) to jump to the '_how this works_' section.

### what is '_natural finger positioning_'?
your fingers' natural positioning on the keyboard are the 10 keys that each of your fingers (assuming 10) lays on while inactive (not typing).

for people who learned to type in a strict environment (or using a website like [typing.com](https://www.typing.com)), your natural positioning may be the home row (the middle row that starts with `a` and ends with `l`), excluding your thumbs on the space bar of course.

![Keyboard-3](https://user-images.githubusercontent.com/114739901/208339685-36ff29d2-917c-4dc8-a22d-a696d5210739.jpg)

> my natural finger positioning. this is the positioning that i will be referencing throughout this document.

for me, my left hand fingers are conditioned to lay in the `wasd` section of the keyboard, except that my hand expands a little (since `wasd` is compact and uncomfortable), so my index and middle finger shift one key to the right.

in comparison, my right hand is tilted inwards for comfort, which influences how my fingers are positioned.

</br>

### what are '_the keys that each finger is in charge of_'?
each finger is 'assigned' to a section of keys on the keyboard. this is how muscle memory works for typing. for example, your left and right index fingers are 'in charge' of the `f` and the `j` keys, respectively.

therefore, the set of keys that a specific finger is used to pressing are labeled as the _keys that the finger is in charge of_.

![Keyboard-33](https://user-images.githubusercontent.com/114739901/208344113-3d7f0245-8a2d-4d3a-b339-5a2e1429c1a3.jpg)

> the keys each of my fingers are 'assigned' to. these are the assignments that i will be referencing throughout this document

</br>

### what are '_the keys that the user feels most comfortable pressing_'?
this program reassigns alphabet characters to different keys on the keyboard. because some characters in the english language are more common than others (`e`, for example, is much more common than `x`), their assigned key should naturally feel more comfortable to press.

therefore, we need to create a prioritized list of the keyboard keys (QWERTY keys) that are most comfortable to press. this often starts off with the keys that your [fingers naturally lay on](#what-is-natural-finger-positioning).

```python 
QWERTY_KEY_COMFORT_ORDER = ['F', 'J', 'E', 'O', 'A', 'P', 'M', 'L', 'I', 'Q',
                            'R', 'K', 'U', 'H', 'W', 'N', 'S', 'D', 'T', 'C', 'G', 'V', 'Y', 'B', 'X', 'Z']
```

> my list for the most comfortable QWERTY keys to press. evidently, the first six slots are taken by natural finger positions.

</br>

### how to maximize typing speed by maximizing finger diversity using the aforementioned typing patterns

well, nobody is perfect. this goes for your fingers as well. some fingers work harder than others, and that is normal. 

**_in my opinion, the biggest constraint to inhumane 26-key typing speeds are words whose digraph (sets of two) letters are typed using the same finger._**

> try it yourself! type the word `look`. if we type it the same way, we use the same finger for all four letters. this means that we allocate extra wasted time towards moving fingers to different keys for contiguous letters that use the same finger (or to unpress and repress the same key).

> as a comparison, type the word `beacons`. this might not be universal, but i can type `beacons` faster than i can type the word `look`. this is because the diversity in finger usage, which is an idea that this program acknowledges and takes advantage of.

> now try the word `sewers`. even though this word changes fingers for contiguous letters, it still uses 2 fingers for the entire 6 letter string! because of this, it almost suffers the same fate as `look` despite having some finger diversity...

from this point onwards, familiarize yourself with the following notation:

- `L` signifies `Left hand`. 
- `R` signifies `Right hand`. 
- `1..5` signifies fingers, where `1` is thumb and `5` is pinky.  
  
therefore, from left to right, the order of fingers is `L5`, `L4`, `L3`, `L2`, `L1`, `R1`, `R2`, `R3`, `R4`, `R5`.

> the above statement assumes you have 10 fingers

</br>

_why is `beacons` faster to type than `look`_?

> for me, `beacons` is typed as follows: `R2`, `L3`, `L4`, `L2`, `R3`, `R2`, `L3`. five unique keys are pressed, with no contiguous (neighboring) keys pressed by the same finger.

> for me, `look` is typed as follows: `R3`, `R3`, `R3`, `R3`. do you see the issue? obviously, some people may type `look` with 2 fingers instead of 1, but regardless, the point is that this word is slow to type because there are neighboring keys assigned to the same finger.

</br>

**_therefore, to maximize typing speeds, we really should be looking to maximize finger diversity among the most frequent digraphs in the top 2000~ most common words of the english language_**

first, we need to gather the top 2000 most common words, which is displayed below

<img width="1696" alt="Screenshot 2022-12-27 at 12 46 39 AM" src="https://user-images.githubusercontent.com/114739901/209639266-6afb076a-1154-4a33-afd2-54f42fcc20cc.png">

then we need to tokenize the words into digraphs (groups of two letters)

<img width="1690" alt="Screenshot 2022-12-27 at 12 45 20 AM" src="https://user-images.githubusercontent.com/114739901/209639186-04cd7e1c-145d-4226-b453-1e11661930bc.png">

next, we check to see which digraphs are most frequent

<img width="1702" alt="Screenshot 2022-12-27 at 12 47 41 AM" src="https://user-images.githubusercontent.com/114739901/209639547-86384fd3-92d0-45a9-9728-25b52c4beef9.png">

at this point, we can check to see which letters are most frequent (ex. `e`, `i`, `a`...) and then list their most common digraph pairings (which we can use to find their most common neighbor).

<img width="1684" alt="Screenshot 2022-12-27 at 12 51 17 AM" src="https://user-images.githubusercontent.com/114739901/209640102-50a8eebd-6956-4e35-82e5-8eae95cee93e.png">

> this output above only displays the 5 most common digraph pairings.

starting with the most frequent letters, we assign those select characters to the [most comfortable QWERTY key positions](#what-are-the-keys-that-the-user-feels-most-comfortable-pressing). 

for example, the `e` character (most common) will get assigned to the `F` QWERTY key, which was listed as the most comfortable.

after assigning the most frequent letter to the most comfortable spot, we assign the letter's common neighbors (digraph pairings) to the next few most comfortable keys **that have not already been assigned to a finger**

**this will ensure that the most common character is assigned to a finger that none of the character's common neighbors are assigned to**

</br>

we repeat this process with the next most frequent letter (`i`), except that while we are assigning characters to QWERTY keys (prioritized by comfort) from this point onward, we skip the QWERTY keys that are already assigned to a finger in charge of the letter's (`i`) other common neighbors. if there are no available spots, then just assign to the primary comfortable QWERTY key that was skipped over.

**_this algorithm will create a keyboard layout that maximizes typing speed by minimizing the wasted time allocated towards moving fingers to different keys for contiguous letters that use the same finger_**

</br>

------------

</br>

### process (chronological order)

</br>

**access a list of the 2000 most common English words**

<img width="1668" alt="Screenshot 2022-12-27 at 1 20 44 AM" src="https://user-images.githubusercontent.com/114739901/209644024-247261d9-a935-4c82-956f-9a46f97f33ae.png">

**parse through the raw copy-and-paste and filter for valid words only**

<img width="1259" alt="Screen Shot 2022-12-18 at 7 30 21 PM" src="https://user-images.githubusercontent.com/114739901/208342027-7d136f48-53ff-4619-9fb4-142f4fa4f970.png">

**tokenize the words into groups of two letters**

<img width="1702" alt="Screenshot 2022-12-27 at 12 47 41 AM" src="https://user-images.githubusercontent.com/114739901/209639547-86384fd3-92d0-45a9-9728-25b52c4beef9.png">

**create a frequency count map of 26^2 keys. Keys range from 'aa' -> 'ab' -> ... -> 'zy' -> 'zz'**

<img width="1264" alt="Screen Shot 2022-12-18 at 7 32 49 PM" src="https://user-images.githubusercontent.com/114739901/208342235-ae45744a-cfe3-4b5d-b3e3-4edb5426fb45.png">

**populate the count map based on the token occurrences**

<img width="1263" alt="Screen Shot 2022-12-18 at 7 34 03 PM" src="https://user-images.githubusercontent.com/114739901/208342371-095a5798-577c-4b25-82df-7febe08ee653.png">

**create a way to display keyboard**

```python
# inside class
def print(self, is_raw) -> None:
    for row in range(len(self.keyboard)):
        if not is_raw:
            self.print_space(row)
        for key in self.keyboard[row]:
            self.print_key(key.letter)
        self.print_newline()
```

<img width="1266" alt="Screen Shot 2022-12-18 at 9 29 56 PM" src="https://user-images.githubusercontent.com/114739901/208354254-835fea17-9d62-4fe1-9d9a-42e69f4d9a7e.png">

> `-` is a placeholder for the correct letter assigned to the key

**access matrix notation (2D array) version of keyboard**

<img width="1254" alt="Screen Shot 2022-12-18 at 9 33 38 PM" src="https://user-images.githubusercontent.com/114739901/208354725-e6f183bd-b5d9-4daf-a3a0-5cd65844ebca.png">

**assign specific keys to their respective finger**

this is a diagram that displays the keys assigned to each finger. by default, each key is set to `-` (see note above)

<img width="1269" alt="Screen Shot 2022-12-18 at 10 05 44 PM" src="https://user-images.githubusercontent.com/114739901/208358828-d866fc55-897f-4f3b-84ed-fcd861c12224.png">

**figure out which keys are typed with which fingers**

![Keyboard-33](https://user-images.githubusercontent.com/114739901/208344113-3d7f0245-8a2d-4d3a-b339-5a2e1429c1a3.jpg)

**at this point, i started to prioritize which keys are most comfortable to press. that is, i tried finding the order in which i would assign the keys to specific fingers at the beginning of my algorithm. i discovered a cool roadblock:**

lets say for example i want the first priority key to be `F` and the second `J`. This makes sense. `E` and `O` next. `R` and `U` next (closest to index home position). here comes the tricky part. Lets say the next most comfortable key to press is `N`. This only works if the letter before or after `N` in an arbitrary word is not `O`, `P`, or `L` because then i would need to stretch my two fingers apart in order to click both keys (instead of moving my hand to press the N by it self). hopefully this makes sense.

> If it doesn't: Press `N` with `R2` and press `O` with `R3`. You have to stretch your fingers! Even though `N` is supposed to be a comfortable key, this is uncomfortable! 

solution: when going through the character list in order to assign to a key, assign letters which are most commonly paired with it to more comfortable keys. AKA skip to the next ordered comfort placement if the current one does not "align" with the current character's most common pair. can be improved.

**display which letter is used the most between all digraphs.**

```python
# Adds 1 to frequency_letter[letter] for every occurrence of letter in every digraph
for digraph in cintiguous_count.keys():
    for letter in digraph:
        frequency_letter[letter] += contiguous_count[digraph]
```

<img width="1278" alt="Screen Shot 2022-12-18 at 10 32 35 PM" src="https://user-images.githubusercontent.com/114739901/208362475-e518eefa-975d-4628-a2ea-9d4573ce9f51.png">

**access the coordinate point for every physical key on the QWERTY keyboard**

![Keyboard-333](https://user-images.githubusercontent.com/114739901/208387727-c380b3e1-61de-473f-8150-3b83b24ad315.jpg)

```python
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
    QWERTY_KEY_PAIR[letter.upper()] = (row, ind - column)
```

<img width="1261" alt="Screen Shot 2022-12-19 at 12 53 46 AM" src="https://user-images.githubusercontent.com/114739901/208386045-1f75ecbc-bdb3-40e2-9cdb-02e68e25aad6.png">

> **for example, now the `e` key on the keyboard (home position for `L3`) is accessible through the point `[0][2]`, which is unique to the `e` QWERTY key only (whose new character value will be determined later)**

**create a subjective ordered list of the QWERTY keys i find most comfortable to press given my personal hand positioning**

```python
QWERTY_KEY_COMFORT_ORDER = ['F', 'J', 'E', 'O', 'A', 'P', 'M', 'L', 'I', 'Q',
                            'R', 'K', 'U', 'H', 'W', 'N', 'S', 'D', 'T', 'C', 'G', 'V', 'Y', 'B', 'X', 'Z']
```

**create a way to access QWERTY key in finger notation based on character**

```python
get_finger("E")
get_finger("J")
get_finger("H")
```

<img width="1267" alt="Screen Shot 2022-12-19 at 2 40 26 AM" src="https://user-images.githubusercontent.com/114739901/208407622-df029a6d-cb12-4e66-a483-4c69f6b8a793.png">

**display other QWERTY keys (physical keys) assigned to specific QWERTY key**

```python
char = 'E'
print(f'FINGER IN CHARGE OF [{char}]: ', end = "")
for key in get_finger(char).keys:
    print(f'[{key.qwerty_key}] ', end = "")
```

<img width="1311" alt="Screen Shot 2022-12-19 at 3 07 11 AM" src="https://user-images.githubusercontent.com/114739901/208412509-e5751cfd-9d80-4d87-8f97-051059d24689.png">

**group each char together with the digraphs that contain the char. order the digraphs by occurrence frequency. only show the first n amount (`n` = 5 in this case)**

<img width="1266" alt="Screen Shot 2022-12-19 at 1 57 43 AM" src="https://user-images.githubusercontent.com/114739901/208398828-390cb09f-de02-4a0a-a06f-060449c127be.png">

- **filter the iterating char from the digraph groupings**

<img width="1392" alt="Screen Shot 2022-12-19 at 3 42 11 AM" src="https://user-images.githubusercontent.com/114739901/208418391-645333fa-ea83-4569-8dd8-04a79fe6f069.png">

- **algorithm recap**

1. Find most common character among all digraphs among all words of the top 2000 English words (`e` for example)
2. Assign that character to the most comfortable key spot (QWERTY's `f` key in my opinion)
3. Gather the next `n` amount of most common pairing characters for this character and assign them to the next best letter spots **without allowing the same finger to be assigned to more than one**
4. Repeat this process with the next most common character

for `e`, the most common digraphs are `re`, `er`, `en`, `te`, and `le` (`n` = 5 in this example). Therefore, I want to assign the letter `r` to the second most comfortable spot. If this spot is using the same finger as a common neighbor, move to the next most comfortable spot. This process repeats with `n` and `t` ... And then this entire process repeats with `i` because it is the second most common letter.

the following image represents each neighboring letter (`n` = 1..5), the QWERTY key it will be assigned to (assuming it is not taken), and the position of the QWERTY key on the keyboard.

<img width="1382" alt="Screen Shot 2022-12-19 at 3 50 23 AM" src="https://user-images.githubusercontent.com/114739901/208419801-c53516ec-6e2a-4055-99aa-b22c0c3bfa8d.png">

- **algorithm implementation (no finger neighbor constraint yet)! Yay!**

<img width="1386" alt="Screen Shot 2022-12-19 at 4 40 56 AM" src="https://user-images.githubusercontent.com/114739901/208428529-ae936713-6fc9-4a85-8091-badf9e42ed67.png">

> the most comfortable key, `F`, is set to the most common letter, `E`. Next, assign the next few most comfortable keys to the most common digraph pairings of `E` (`R`, `N`, `T`, `L`, see above). Next, move to the next most common letter, `I`. Assign the next most comfortable key to `I`, and assign the following most comfortable keys to `I`'s most common digraph pairings (`O`, `S`, ...) etc. 

<img width="1404" alt="Screen Shot 2022-12-19 at 4 50 38 AM" src="https://user-images.githubusercontent.com/114739901/208430194-30408223-c47a-485c-a7b1-7a31fbba82d5.png">

> this layout, for example, is most comfortable at lower typing speeds. Think of the word `tacos`. All of the letters are located in the most comfortable spots using two of the most comfortable fingers (`R2`, `R3`). The next goal is to make sure this never happens. We want the keys of common digraphs (`ac` for example) to be as far away from each other as possible to ensure that they can be typed using different fingers (minimizing overall keystroke time).

<img width="1405" alt="Screen Shot 2022-12-19 at 4 50 45 AM" src="https://user-images.githubusercontent.com/114739901/208430211-485a4a07-7b52-4359-a2b3-4171ec1a554c.png">
