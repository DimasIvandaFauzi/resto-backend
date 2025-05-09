export const errorHandler = (err, req, res, next) => {
    let resStatusCode = res.statusCode === 200 ? 500 : res.statusCode
    let message = err.message

    if(err.name === 'ValidationError') {
        resStatusCode = 400
        message = Object.values(err.errors).map((item) => item.message).join(', ')
    }

    res.status(resStatusCode).json({
        message,
        stack: err.stack
    })
}

export const pathNotFound = (req, res, next) => {
    const error = new Error(`Path ${req.originalUrl} tidak ditemukan`)
    res.status(404)
    next(error)
}