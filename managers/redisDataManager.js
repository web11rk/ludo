export const getObjectKeys = (newData) => {
    const expectedData = []
    Object.keys(newData).forEach(key => {
        if (typeof newData[key] === 'string') {
            expectedData.push(key)
            expectedData.push(newData[key])
        } else {
            if (newData[key]) {
                expectedData.push(key)
                expectedData.push(newData[key].toString())
            }
        }
    })
    return expectedData
}