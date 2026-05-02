with open('ai/.env', 'rb') as f:
    hex_data = f.read().hex()
    print(hex_data)
