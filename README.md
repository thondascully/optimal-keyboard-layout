**Prints out the keyboard layout in which every key is as far away from its most common neighbor throughout the top 2000 words in the English language**
> **`"hello"` -> `h` and `e` are neighbors**

**This specific layout is customized for my specific hand positioning while typing.**

![Keyboard-3](https://user-images.githubusercontent.com/114739901/208339685-36ff29d2-917c-4dc8-a22d-a696d5210739.jpg)

> Notation: `L` signifies `Left hand`. `R` signifies `Right hand`. `1..5` signifies fingers, where `1` is thumb and `5` is pinky. Therefore, from left to right, the order of fingers is `L5`, `L4`, `L3`, `L2`, `L1`, `R1`, `R2`, `R3`, `R4`, `R5`.

Known: At WPM exceeding 120ish (rough guess), typing speed is negatively impacted by words whose physical keys on the keyboard are typed by the same finger.

In comparison, words whose sets of neighbors (sets of two letters) are typed by different fingers are much faster to execute.

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

------------

### Process
- **Access a list of the 2000 most common English words**

<img width="1254" alt="Screen Shot 2022-12-18 at 7 27 38 PM" src="https://user-images.githubusercontent.com/114739901/208341768-59648ecc-f83a-4bab-8d8e-bfc171c1d8aa.png">

- **Parse through and filter for valid words only (and not random raw copy paste junk)**

<img width="1259" alt="Screen Shot 2022-12-18 at 7 30 21 PM" src="https://user-images.githubusercontent.com/114739901/208342027-7d136f48-53ff-4619-9fb4-142f4fa4f970.png">

- **Tokenize the words into groups of two letters

<img width="1255" alt="Screen Shot 2022-12-18 at 7 26 55 PM" src="https://user-images.githubusercontent.com/114739901/208341705-e5d7590d-0a28-4398-9f45-2aa13d799031.png">


