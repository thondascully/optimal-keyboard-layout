# optimal keyboard layout: how to maximize typing speed by minimizing keystroke count

> this program accounts for the user's natural finger positioning, the keys that each finger is in charge of, and the keys that the user feels most comfortable pressing. 

### what is _natural finger positioning_?
your fingers' natural positioning on the keyboard are the 10 keys that each of your fingers (assuming 10) lays on while inactive (not typing).

for people who learned to type in a strict environment (or using a website like [typing.com](https://www.typing.com)), your natural positioning may be the home row (the middle row that starts with `a` and ends with `l`), excluding your thumbs on the space bar of course.

![Keyboard-3](https://user-images.githubusercontent.com/114739901/208339685-36ff29d2-917c-4dc8-a22d-a696d5210739.jpg)

> my natural finger positioning. this is the positioning that i will be referencing throughout this document.

for me, my left hand fingers are conditioned to lay in the `wasd` section of the keyboard, except that my hand expands a little (since `wasd` is compact and uncomfortable), so my index and middle finger shift one key to the right.

in comparison, my right hand is tilted inwards for comfort, which influences how my fingers are positioned.

</br>

### what are _the keys that each finger is in charge of_?
each finger is 'assigned' to a section of keys on the keyboard. this is how muscle memory works for typing. for example, your left and right index fingers are 'in charge' of the `f` and the `j` keys, respectively.

therefore, the set of keys that a specific finger is used to pressing are labeled as the _keys that the finger is in charge of_.

![Keyboard-33](https://user-images.githubusercontent.com/114739901/208344113-3d7f0245-8a2d-4d3a-b339-5a2e1429c1a3.jpg)

> the keys each of my fingers are 'assigned' to. these are the assignments that i will be referencing throughout this document

</br>

well, nobody is perfect. this goes for your fingers as well. some fingers work harder than others, and that is normal. 

**_in my opinion, the biggest constraint to inhumane 26-key typing speeds are words whose digraph (sets of two) letters are typed using the same finger._**

> try it yourself! type the word `look`. if we type it the same way, we use the same finger for all four letters, meaning that we need to spend the time it takes for four complete keystroke in order to type this word.

> as a comparison, type the word `beacons`. this might not be universal, but i can type `beaconse` faster than i can type the word `look`. this is because the diversity in finger usage, which is an idea that this program acknowledges and takes advantage of. this is covered further in 

beacon look llook
</br>

> Notation: `L` signifies `Left hand`. `R` signifies `Right hand`. `1..5` signifies fingers, where `1` is thumb and `5` is pinky. Therefore, from left to right, the order of fingers is `L5`, `L4`, `L3`, `L2`, `L1`, `R1`, `R2`, `R3`, `R4`, `R5`.


**Try it yourself! Type `beacon` and then type `reviewers`. As you can probably tell, `beacon` is much easier to type than `reviewers` because of the diversity in finger usage (and consistent hand swapping).** beacons

> For me, `beacon` is typed as follows: `R2`, `L3`, `L4`, `L2`, `R3`, `R2`. It should be noted that `R2` repeats once, but only after 5 other key registers. This is enough time for it to feel comfortable.

> For me, `reviewers` is typed as follows: `L2`, `L3`, `L2`, `R3`, `L3`, `L3`, `L3`, `L2`, `L3`. It should be noted that `L3` repeats 5 times, with 4 of them being within a 5 key register time span. This is uncomfortable!

Disclaimer: words such as `reviewers` are hard on _my_ hand positioning layout. This is not universal. Unfortunately, this program is created with _my_ hand layout in mind, **so it might not be tailored for you as a reader**.

More food for thought: For me, I can type `beacon` much faster than I can type `waters`. The word `waters` is typically typed using 3 fingers from the same hand. The digraph letter groups in `waters` are typed by different fingers (a single finger will not be used two keystrokes in a row), yet it is still slower to execute than the 6-letter word `beacon`. 

-------------

My passwords are typically `beacon` or `shadow` because every letter is typed using a different finger (or avoids the same finger usage for 2-3 letters in a row), meaning it can be typed in pretty much minimal keystroke time.

Words like these two interest me. I want to find a keyboard layout that maximizes these types of words (that is, minimizes the amount of almost contiguous key strokes typed by the same finger).

### What about Dvorak?
With dvorak, there is no guarantee (and it is almost uncommon) for different fingers to be used for each neighboring letter of an english word.

### What about Qwerty?
I am kind of aiming for qwerty's initial goal with this layout. I think I can do better though. Additionally (not sure if possible unless using a Robot library), another solution I would suggest is including an easily accessible key on the keyboard that repeats the last letter typed. Therefore, words like `hello` can be typed without using the same finger for both `l`s. 


### 
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

</br>
</br>

- **Parse through and filter for valid words only (and not random raw copy paste junk)**

<img width="1259" alt="Screen Shot 2022-12-18 at 7 30 21 PM" src="https://user-images.githubusercontent.com/114739901/208342027-7d136f48-53ff-4619-9fb4-142f4fa4f970.png">

- **Tokenize the words into groups of two letters**

<img width="1255" alt="Screen Shot 2022-12-18 at 7 26 55 PM" src="https://user-images.githubusercontent.com/114739901/208341705-e5d7590d-0a28-4398-9f45-2aa13d799031.png">

- **Create a frequency count map of 26^2 keys. Keys range from 'aa' -> 'ab' -> ... -> 'zy' -> 'zz'**

<img width="1264" alt="Screen Shot 2022-12-18 at 7 32 49 PM" src="https://user-images.githubusercontent.com/114739901/208342235-ae45744a-cfe3-4b5d-b3e3-4edb5426fb45.png">

- **Populate the count map based on the token occurrences**

<img width="1263" alt="Screen Shot 2022-12-18 at 7 34 03 PM" src="https://user-images.githubusercontent.com/114739901/208342371-095a5798-577c-4b25-82df-7febe08ee653.png">

- **Create a way to display keyboard**

<img width="1275" alt="Screen Shot 2022-12-18 at 9 32 11 PM" src="https://user-images.githubusercontent.com/114739901/208354506-f7b58cee-dec4-482c-b625-ce8e9f219e70.png">

<img width="1266" alt="Screen Shot 2022-12-18 at 9 29 56 PM" src="https://user-images.githubusercontent.com/114739901/208354254-835fea17-9d62-4fe1-9d9a-42e69f4d9a7e.png">

> `-` is a placeholder for the correct letter assigned to the key

- **Access matrix notation (2D array) version of keyboard**

<img width="1254" alt="Screen Shot 2022-12-18 at 9 33 38 PM" src="https://user-images.githubusercontent.com/114739901/208354725-e6f183bd-b5d9-4daf-a3a0-5cd65844ebca.png">

- **Assign specific keys to their respective finger**

This is a diagram that displays the keys assigned to each finger. By default, each key is set to `-` (see note above)

<img width="1269" alt="Screen Shot 2022-12-18 at 10 05 44 PM" src="https://user-images.githubusercontent.com/114739901/208358828-d866fc55-897f-4f3b-84ed-fcd861c12224.png">

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

Solution: going through the character list in order to assign to a key, assign letters which are most commonly paired with it to more comfortable keys. AKA skip to the next ordered comfort placement if the current one does not "align" with the current character's most common pair

- **Display which letter is used the most between all digraphs.**

<img width="1270" alt="Screen Shot 2022-12-18 at 10 31 55 PM" src="https://user-images.githubusercontent.com/114739901/208362398-f994f75f-0247-4e54-b4ac-a958f051ec3c.png">

<img width="1278" alt="Screen Shot 2022-12-18 at 10 32 35 PM" src="https://user-images.githubusercontent.com/114739901/208362475-e518eefa-975d-4628-a2ea-9d4573ce9f51.png">

- **Access the coordinate point for every physical key on the QWERTY keyboard**

![Keyboard-333](https://user-images.githubusercontent.com/114739901/208387727-c380b3e1-61de-473f-8150-3b83b24ad315.jpg)

<img width="1255" alt="Screen Shot 2022-12-19 at 12 46 50 AM" src="https://user-images.githubusercontent.com/114739901/208384595-b1036bfa-766d-41bc-83f5-0506fa15858a.png">

<img width="1261" alt="Screen Shot 2022-12-19 at 12 53 46 AM" src="https://user-images.githubusercontent.com/114739901/208386045-1f75ecbc-bdb3-40e2-9cdb-02e68e25aad6.png">

> **For example, now the `e` key on the keyboard (home position for `L3`) is accessible through the point `[0][2]`, which is unique to the `e` QWERTY key only (whose new character value will be determined later)**

- **Create a subjective ordered list of the QWERTY keys i find most comfortable to press given my personal hand positioning**

<img width="785" alt="Screen Shot 2022-12-19 at 1 54 07 AM" src="https://user-images.githubusercontent.com/114739901/208398096-3a6d0d91-c061-431a-bd9f-6ca2f5f47e2e.png">

- **Create a way to access QWERTY key in finger notation based on character**

<img width="1271" alt="Screen Shot 2022-12-19 at 2 40 33 AM" src="https://user-images.githubusercontent.com/114739901/208407645-a6157fde-b009-48d7-864f-1392dc5ff9ee.png">

<img width="1267" alt="Screen Shot 2022-12-19 at 2 40 26 AM" src="https://user-images.githubusercontent.com/114739901/208407622-df029a6d-cb12-4e66-a483-4c69f6b8a793.png">

- **Display other QWERTY keys (physical keys) assigned to specific QWERTY key**

<img width="1311" alt="Screen Shot 2022-12-19 at 3 07 11 AM" src="https://user-images.githubusercontent.com/114739901/208412509-e5751cfd-9d80-4d87-8f97-051059d24689.png">

<img width="1182" alt="Screen Shot 2022-12-19 at 3 07 30 AM" src="https://user-images.githubusercontent.com/114739901/208412559-cba2590f-47ed-4528-b35c-91cea591923b.png">

- **Group each char together with the digraphs that contain the char. Order the digraphs by occurrence frequency. Only show the first n amount (`n` = 5 in this case)**

<img width="1266" alt="Screen Shot 2022-12-19 at 1 57 43 AM" src="https://user-images.githubusercontent.com/114739901/208398828-390cb09f-de02-4a0a-a06f-060449c127be.png">

- **Filter the iterating char from the digraph groupings**

<img width="1392" alt="Screen Shot 2022-12-19 at 3 42 11 AM" src="https://user-images.githubusercontent.com/114739901/208418391-645333fa-ea83-4569-8dd8-04a79fe6f069.png">

- **Algorithm recap**

1. Find most common character among all digraphs among all words of the top 2000 English words (`e` for example)
2. Assign that character to the most comfortable key spot (QWERTY's `f` key in my opinion)
3. Gather the next `n` amount of most common pairing characters for this character and assign them to the next best letter spots **without allowing the same finger to be assigned to more than one**
4. Repeat this process with the next most common character

For `e`, the most common digraphs are `re`, `er`, `en`, `te`, and `le` (`n` = 5 in this example). Therefore, I want to assign the letter `r` to the second most comfortable spot. If this spot is using the same finger as a common neighbor, move to the next most comfortable spot. This process repeats with `n` and `t` ... And then this entire process repeats with `i` because it is the second most common letter.

The following image represents each neighboring letter (`n` = 1..5), the QWERTY key it will be assigned to (assuming it is not taken), and the position of the QWERTY key on the keyboard.

<img width="1382" alt="Screen Shot 2022-12-19 at 3 50 23 AM" src="https://user-images.githubusercontent.com/114739901/208419801-c53516ec-6e2a-4055-99aa-b22c0c3bfa8d.png">

- **Algorithm implementation (no finger neighbor constraint yet)! Yay!**

<img width="1386" alt="Screen Shot 2022-12-19 at 4 40 56 AM" src="https://user-images.githubusercontent.com/114739901/208428529-ae936713-6fc9-4a85-8091-badf9e42ed67.png">

> The most comfortable key, `F`, is set to the most common letter, `E`. Next, assign the next few most comfortable keys to the most common digraph pairings of `E` (`R`, `N`, `T`, `L`, see above). Next, move to the next most common letter, `I`. Assign the next most comfortable key to `I`, and assign the following most comfortable keys to `I`'s most common digraph pairings (`O`, `S`, ...) etc. 

<img width="1404" alt="Screen Shot 2022-12-19 at 4 50 38 AM" src="https://user-images.githubusercontent.com/114739901/208430194-30408223-c47a-485c-a7b1-7a31fbba82d5.png">

> This layout, for example, is most comfortable at lower typing speeds. Think of the word `tacos`. All of the letters are located in the most comfortable spots using two of the most comfortable fingers (`R2`, `R3`). The next goal is to make sure this never happens. We want the keys of common digraphs (`ac` for example) to be as far away from each other as possible to ensure that they can be typed using different fingers (minimizing overall keystroke time).

<img width="1405" alt="Screen Shot 2022-12-19 at 4 50 45 AM" src="https://user-images.githubusercontent.com/114739901/208430211-485a4a07-7b52-4359-a2b3-4171ec1a554c.png">



