const express = require("express");
const {open} = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const { off } = require("process");

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

// Get Books API
app.get("/books/", async (request, response) => {
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

// Get Single Book Details API
app.get("/books/:bookId/", async (request, response) => {
    const {bookId} = request.params;
    const getBookQuery = `
        SELECT * FROM Book WHERE id = '${bookId}';
    `;
    const book = await db.get(getBookQuery);
    response.send(book);
});

// Add Book API
app.post("/books/", async (request, response) => {
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

// Update Book API
app.put("/books/:bookId/", async (request, response) => {
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

// Delete Book API
app.delete("/books/:bookId", async (request, response) => {
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


// Get Category Based Books List API
app.get("/category/:categoryId/books/", async (request, response) => {
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

// Create a New User API
app.post("/users/", async (request, response) => {
    const { username, name, password, gender, location} = request.body;
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

// Get Users API 
app.get("/users/", async (request, response) => {
    const getUsersQuery = `
        SELECT * FROM User;
    `;
   const usersArray = await db.all(getUsersQuery);
   response.send(usersArray);
});