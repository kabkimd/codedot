# < CodeDot >

⚪ CodeDot is a browser-based code editor for creative education.

In simple words, CodeDot allows students to host and edit their web-pages in a shared server, or under the same domain. In more technical words, the app combines a file manager with a code editor and a user authentication system for browser-based editing of content hosted at top-level domain.

CodeDot is built to empower art students to a coding practice that is autonomous, self-determined, sufficient, and caring. The source code in this repository is used at [code.kabkimd.nl](code.kabkimd.nl) by [I/M/D](https://www.kabk.nl/en/programmes/bachelor/interactive-media-design) students to edit their web-pages at [kabkimd.nl](kabkimd.nl)


## How can I reproduce this project? 

First of all, you need a server. You can rent a Virtual Private Server (VPS), buy one yourself or, if you are geeky, make one out of your old computer.


**Clone GIT and run npm**
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
```

Check agents.md for technical instructions
