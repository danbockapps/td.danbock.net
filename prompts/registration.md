# Tournament Director

Build a registration system for chess tournaments. It will be hosted at td.danbock.net. It should use yarn v1, Next.js, TypeScript, SQlite, Drizzle ORM, daisyUI, and prettier. Use this prettier config:

```
 "prettier": {
    "semi": false,
    "singleQuote": true,
    "printWidth": 100,
    "bracketSpacing": false,
    "plugins": [
      "prettier-plugin-organize-imports",
      "prettier-plugin-classnames"
    ]
  }
```

## Admin functions

I don't want to deal with user accounts or authentication to start with. Admin functions should be protected by a hardcoded admin password for now. Suggest ways to harden this security-wise, given this is a low-stakes website that is unlikely to be hacked, and the consequences of a hack are small.

1. Create tournament - enter slug for URL, name of tournament, number of rounds
1. Edit player entries - edit rating and name of each player
1. Pair next round
1. Enter results

We don't need any site navigation. Admins will know what the URLs are, and players will access the registration URL via QR code.

## Player registration entry

There should be an entry URL with tournament slug and round number. Players should see a very simple UI where they enter their USCF ID (8 digit number), we get their name and rating from the USCF API, and they verify it's correct and submit. For the first iteration we have to mock the API. The mock should return a random rating between 100 and 2300, with a 40% probability of being unrated, and a random name. Also we don't know the exact shape of the real API, so just make something reasonable and we'll adjust later.

Important wrinkle: Initially, registration is by round. Not all players play in all rounds of a tournament. A round has no players until players register.

## Pairings engine

When the admin pairs the next round, the pairings engine will determine the pairings. Initially the system will be very simple: Order player by rating, and pair #1 vs. #2, #3 vs. #4, and so on. The admin will choose white or black, and the higher seed in each game will get that color. In the future there will be different engines available.

## Tournament info screen

This will be displayed on the large monitor on the wall of the tournament hall. The URL needs to have tournament slug and round number. If the round has been paired, this screen should just show the pairings. If the round hasn't been paired, it should show (a) the list of entries and (b) a QR code for players to use to access the registration entry page. On desktop these should be side by side.

## Pairings and entries pages

There should be a route that shows pairings for all rounds, and a route that shows entries for all rounds. Use reusable components that can be used on these pages as well as the tournament info screen.
