import uvicorn

if __name__ == "__main__":
    print("Mol Vol Spec Server")

    uvicorn.run(app="app.main:app", host="0.0.0.0", port=9000, reload=True)
