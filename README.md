# < CodeDot >

⚪ CodeDot is a browser-based code editor for creative education.

In simple words, CodeDot allows students to host and edit their web-pages in a shared server, or under the same domain. In more technical words, the app combines a file manager with a code editor and a user authentication system for browser-based editing of content hosted at top-level domain.

✊ CodeDot is built to empower art students to a coding practice that is autonomous, self-determined, sufficient, and caring. 

The source code in this repository is used at [code.kabkimd.nl](https://code.kabkimd.nl) by [I/M/D](https://www.kabk.nl/en/programmes/bachelor/interactive-media-design) students to edit their web-pages at [kabkimd.nl](https://kabkimd.nl)


## How can I reproduce this project? 

-- instructions below are incomplete! come back for it or mail l.scarin at kabk.nl --

**Get a server**
Rent a virtual private server (VPS), buy one, or turn your old computer into one 🦗

**Install fundamental tools**
To build the app I used *nodejs* and a bunch of its libraries. To handle server's proxies and redirects I used *nginx*. For password reset forms through email I used *mailgun*. To handle databases I used *mysql*.

**Clone project and install libraries**
```sh
# Clone the repository using the project's Git URL.
git clone github.com/kabkimd/codedot.git

# Navigate to the project directory.
cd codedot

# Install the necessary dependencies.
npm i

# Start the API server in a separate terminal.
npm run server

# In another terminal, start the development server with auto-reloading and an instant preview.
npm run dev

# In alternative to the dev server, to build for production:
npm run build
```

Check agents.md for further technical instructions on implementation.