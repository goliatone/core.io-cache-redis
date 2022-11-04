const objectsEqual = (o1, o2) => {
    const iso = o => typeof o === 'object';
    const len = o => o === null ? 0 : Object.keys(o).length;
    return iso(o1) && len(o1) > 0 ?
        len(o1) === len(o2) &&
        Object.keys(o1).every(p => objectsEqual(o1[p], o2[p])) :
        o1 === o2;
}

const arraysEqual = (s1, s2) => {
    if (s1.length !== s2.length) return false;
    const a1 = s1.concat().filter(Boolean);
    const a2 = s2.concat().filter(Boolean);
    return a1.every((o1) => {
        return a2.find(o2 => {
            return objectsEqual(o1, o2);
        });
    });
};


module.exports = {
    arraysEqual,
    objectsEqual,
};