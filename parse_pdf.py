def get_words():
    alpha_words = []
    with open("raw_pdf_top_2000.txt") as file:
            for line in file.readlines():
                for token in (token for token in line.split(' ') if any(map(str.isalpha, token))):
                    if not any(c in '(),' for c in token):
                        alpha_words.append(token.rstrip())
    return alpha_words[15:]

if __name__ == '__main__':
    print(get_words())