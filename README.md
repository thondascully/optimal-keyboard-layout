**Prints out the keyboard layout in which every key is as far away from its most common neighbor throughout the top 2000 words in the English language**
> **`"hello"` -> `h` and `e` are neighbors**

**This specific layout is customized for my specific hand positioning while typing.**

![Keyboard-3](https://user-images.githubusercontent.com/114739901/208339685-36ff29d2-917c-4dc8-a22d-a696d5210739.jpg)

> Notation: `L` signifies `Left hand`. `R` signifies `Right hand`. `1..5` signifies fingers, where `1` is thumb and `5` is pinky. Therefore, from left to right, the order of fingers is `L5`, `L4`, `L3`, `L2`, `L1`, `R1`, `R2`, `R3`, `R4`, `R5`.

Known: At WPM exceeding 120ish (rough guess), typing speed is negatively impacted by words whose physical keys on the keyboard are typed by the same finger.

In comparison, words whose sets of digraphs (sets of two letters) are typed by different fingers are much faster to execute.

**Try it yourself! Type `beacon` and then type `reviewers`. As you can probably tell, `beacon` is much easier to type than `reviewers` because of the diversity in finger usage (and consistent hand swapping).**

> For me, `beacon` is typed as follows: `R2`, `L3`, `L4`, `L2`, `R3`, `R2`. It should be noted that `R2` repeats once, but only after 5 other key registers. This is enough time for it to feel comfortable.

> For me, `reviewers` is typed as follows: `L2`, `L3`, `L2`, `R3`, `L3`, `L3`, `L3`, `L2`, `L3`. It should be noted that `L3` repeats 5 times, with 4 of them being within a 5 key register time span. This is uncomfortable!

Disclaimer: words such as `reviewers` are hard on _my_ hand positioning layout. This is not universal. Unfortunately, this program is created with _my_ hand layout in mind, **so it might not be tailored for you as a reader**.

-------------

My passwords are typically `beacon` or `shadow` because every letter is typed using a different finger (or avoids the same finger usage for 2-3 letters in a row), meaning it can be typed in pretty much minimal keystroke time.

Words like these two interest me. I want to find a keyboard layout that maximizes these types of words (that is, minimizes the amount of almost contiguous key strokes typed by the same finger).

### What about Dvorak?
With dvorak, there is no guarantee (and it is almost uncommon) for different fingers to be used for each neighboring letter of an english word.

### What about Qwerty?
I am kind of aiming for qwerty's initial goal with this layout. I think I can do better though. Additionally (not sure if possible unless using a Robot library), another solution I would suggest is including an easily accessible key on the keyboard that repeats the last letter typed. Therefore, words like `hello` can be typed without using the same finger for both `l`s. 

-------------

The 22 most common pairs of letters (based on the 2000 most common English words):  
```{..., 'ra': 109, 've': 111, 'or': 116, 'se': 121, 'co': 122, 'ea': 123, 'le': 126, 'an': 128, 'io': 131, 'ar': 145, 'nt': 148, 'st': 154, 'al': 156, 'ti': 168, 'at': 170, 'te': 171, 'en': 187, 'on': 214, 'in': 224, 'er': 247, 're': 260}```

> **Recap on project goal**: well abstractly i want to figure out a keyboard layout (think of it as a matrix in this context... row1size10, row2size9, row3size7 with respective offsets etc) where every finger is in charge of the letters least likely to be grouped together (given the list of most common pairs)  
>  
> for example, `re` is paired the most. I dont want my LH index finger to be in charge of both `r` and `e` as that is not optimal and will result in slower typing speeds because of contiguous finger strokes by the same finger. therefore, `r` and `e` should be assigned to different fingers. except this has to happen for every pair as optimally as possible until everyone is as happy as possible

------------

### Process

- **Access a list of the 2000 most common English words**

<img width="1254" alt="Screen Shot 2022-12-18 at 7 27 38 PM" src="https://user-images.githubusercontent.com/114739901/208341768-59648ecc-f83a-4bab-8d8e-bfc171c1d8aa.png">

- **Parse through and filter for valid words only (and not random raw copy paste junk)**

<img width="1259" alt="Screen Shot 2022-12-18 at 7 30 21 PM" src="https://user-images.githubusercontent.com/114739901/208342027-7d136f48-53ff-4619-9fb4-142f4fa4f970.png">

- **Tokenize the words into groups of two letters**

<img width="1255" alt="Screen Shot 2022-12-18 at 7 26 55 PM" src="https://user-images.githubusercontent.com/114739901/208341705-e5d7590d-0a28-4398-9f45-2aa13d799031.png">

- **Create a frequency count map of 26^2 keys. Keys range from 'aa' -> 'ab' -> ... -> 'zy' -> 'zz'**

<img width="1264" alt="Screen Shot 2022-12-18 at 7 32 49 PM" src="https://user-images.githubusercontent.com/114739901/208342235-ae45744a-cfe3-4b5d-b3e3-4edb5426fb45.png">

- **Populate the count map based on the token occurrences**

<img width="1263" alt="Screen Shot 2022-12-18 at 7 34 03 PM" src="https://user-images.githubusercontent.com/114739901/208342371-095a5798-577c-4b25-82df-7febe08ee653.png">

- **Think of algorithm:**

1. Start by finding out which letter is used the most, so sum up all of the frequencies for the digraphs and see which letter has the highest tally
2. Assign this to some random finger (preferably the one most easily accessible)
3. Now, for each of the digraphs it appears in (ordered from most to least common), repeat the process (so do depth first)
4. Ex: let's say `e` appears in the most combos, so you assign it to the left pointer finger
5. Then you get all the things it's together with (say `r`, `s`, and `t`) in that order
6. First you assign `r` to be, say, the right index finger, and then you look at all the combinations `r` is in and do it recursively
> Maybe breadth-first would be better, but I think this is pretty good and time-efficient


- **Figure out which keys are typed with which fingers**

![Keyboard-33](https://user-images.githubusercontent.com/114739901/208344113-3d7f0245-8a2d-4d3a-b339-5a2e1429c1a3.jpg)

- **At this point, I started to prioritize which keys are most comfortable to press. That is, I tried finding the order in which I would assign the keys to specific fingers at the beginning of my algorithm. I discovered a cool roadblock:**

lets say for example i want the first priority key to be `F` and the second `J`. This makes sense. `E` and `O` next. `R` and `U` next (closest to index home position). here comes the tricky part. Lets say the next most comfortable key to press is `N`. This only works if the letter before or after `N` in an arbitrary word is not `O`, `P`, or `L` because then i would need to stretch my two fingers apart in order to click both keys (instead of moving my hand to press the N by it self). hopefully this makes sense.

> If it doesn't: Press `N` with `R2` and press `O` with `R3`. You have to stretch your fingers! Even though `N` is supposed to be a comfortable key, this is uncomfortable! 

Solution: when going through the digraphs list, you assign letters which are most commonly paired with it to more comfortable keys.
