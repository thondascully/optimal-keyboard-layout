def get_words():
    alpha_words = []
    with open("raw_pdf_top_2000.txt") as file:
            for line in file.readlines():
                for token in (token for token in line.split(' ') if any(map(str.isalpha, token))):
                    if not token.__contains__("(") and not token.__contains__(")"):
                        alpha_words.append(token.rstrip())
    return alpha_words[15:]