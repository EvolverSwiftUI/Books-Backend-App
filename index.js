const express = require("express");
const path = require("path");

const {open} = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const MY_SECRET_TOKEN = "NSRNSRNSRNSR";

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "goodreads.db");
let db = null;

const initializeDBAndServer = async () => {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database    
        }); 
        app.listen(3000, () => {
            console.log("Server is running at http://localhost:3000/")
        });
    } catch (e) {
        console.log(`DB Error: ${e.message}`);
        process.exit(1);
    }
};

initializeDBAndServer();

const logger = (request, response, next) => {
    console.log(request.query);
    next();
};

const authenticateToken = (request, response, next) => {
    let jwtToken;
    const authHeader = request.headers["authorization"];
    if (authHeader !== undefined) {
        jwtToken = authHeader.split(" ")[1];
    }
    if (jwtToken === undefined) {
        response.status(401);
        response.send("Invalid Access Token.");
    } else {
        jwt.verify(jwtToken, MY_SECRET_TOKEN, async (error, payload) => {
            if (error) {
                response.status(401);
                response.send("Invalid Access Token.");
            } else {
                request.username = payload.username;
                next();
            }
        });
    }
};

// Get Books API.
app.get("/books/", authenticateToken, async (request, response) => {
    const {limit, offset, order_by, order, search_q} = request.query;
    const getBooksQuery = `
        SELECT 
            * 
        FROM 
            Book
        WHERE
            title LIKE '%${search_q}%'    
        ORDER BY
            ${order_by} ${order}
        LIMIT 
            ${limit} 
        OFFSET 
            ${offset};
    `;
    const booksArray = await db.all(getBooksQuery);
    response.send(booksArray);
});

// Get Book Details API.
app.get("/books/:bookId/", authenticateToken, async (request, response) => {
    const {bookId} = request.params;
    const getBookQuery = `
        SELECT * FROM Book WHERE id = '${bookId}';
    `;
    const book = await db.get(getBookQuery);
    response.send(book);
});

// Add Book API.
app.post("/books/", authenticateToken, async (request, response) => {
    const bookDetails = request.body;
    const { id, pub_id, title, price, category, quantity, b_format, prod_year, filesize } = bookDetails;
    
    const addBookQuery = `
        INSERT INTO 
            Book(
                id, pub_id, title, price, category, quantity, b_format, prod_year, filesize
            )
        VALUES
            (   
                ${id}, 
                ${pub_id}, 
                '${title}',
                ${price},
                '${category}',
                ${quantity},
                '${b_format}',
                ${prod_year},
                ${filesize}
            ) 
    `;
    const dbResponse = await db.run(addBookQuery);
    const bookId = dbResponse.lastID;
    response.send({bookId: bookId});
});

// Update Book API.
app.put("/books/:bookId/", authenticateToken, async (request, response) => {
    const { bookId } = request.params;
    const  bookDetails  = request.body;
    const { pub_id, title, price, category, quantity, b_format, prod_year, filesize } = bookDetails;

    const updateBookQuery = `
        UPDATE
            Book
        SET
            pub_id = ${pub_id},
            title = '${title}',
            price = ${price},
            category = '${category}',
            quantity = ${quantity}, 
            b_format = '${b_format}',
            prod_year = ${prod_year},
            filesize = ${filesize}
        WHERE
            id = '${bookId}'    
    `;

    await db.run(updateBookQuery);
    response.send("Book Updated Successfully.")
});

// Delete Book API.
app.delete("/books/:bookId", authenticateToken, async (request, response) => {
    const {bookId} = request.params;
    const deleteBookQuery = `
        DELETE FROM 
            Book 
        WHERE 
            id = '${bookId}';
    `;
    await db.run(deleteBookQuery);
    response.send("Book Deleted Successfully.")
});


// Get Books API based on Category.
app.get("/category/:categoryId/books/", authenticateToken, async (request, response) => {
    const {categoryId} = request.params;
    const getCategoryBooksQuery = `
        SELECT 
          * 
        FROM
          Book
        WHERE
          category = '${categoryId}';
    `;
    const booksArray = await db.all(getCategoryBooksQuery);
    response.send(booksArray);
});

// Create a New User API (or) User Register API.
app.post("/users/", async (request, response) => {
    const { username, name, password, gender, location } = request.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const selectuserQuery = `
        SELECT 
          * 
        FROM 
          User 
        WHERE 
          username = '${username}';`;

    const dbUser = await db.get(selectuserQuery);

    if (dbUser === undefined) {
        // create a new user.
        const createUserQuery = `
        INSERT INTO
            User(username, name, password, gender, location)
        VALUES
            (
                '${username}',
                '${name}',
                '${hashedPassword}',
                '${gender}',
                '${location}'
            );    
        `;
        await db.run(createUserQuery);
        response.send("User Created Successfully.")
    } else {
        response.status(400);
        response.send("Username alredy exists.");
    }
});

// Get Users API.
app.get("/users/", authenticateToken, async (request, response) => {
    const getUsersQuery = `
        SELECT * FROM User;
    `;
   const usersArray = await db.all(getUsersQuery);
   response.send(usersArray);
});

// Validate User API (or) User Login API.
app.post("/login/", async (request, response) => {
    const {username, password} = request.body;
    const selectuserQuery = `
        SELECT 
          *
        FROM
          User
        WHERE
          username = '${username}';
    `;
    const dbUser = await db.get(selectuserQuery);
    if (dbUser === undefined) {
        // user does't exist.
        response.status(400);
        response.send("Invalid User.")
    } else {
        // compare password and hashedPassword.
        const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
        console.log(isPasswordMatched);
        if (isPasswordMatched === true) {
            const payload = { username: username};
            const jwtToken = jwt.sign(payload, MY_SECRET_TOKEN);
            // response.send("Login Successful.");
            response.send({ jwtToken });
        } else {
            response.status(400);
            response.send("Invalid Password");
        }
    }
});

// Get Profile API.
app.get("/profile/", authenticateToken, async (request, response) => {
    const {username} = request;
    const getUserQuery = `SELECT * FROM User WHERE username = '${username}'`;
    const userDetails = await db.get(getUserQuery);
    response.send(userDetails);
}); 