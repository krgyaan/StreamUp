import { Route, Routes } from "react-router-dom"
import Index from "./pages/Index"
import Upload from "./pages/Upload"
function App() {

    return (
        <>
            <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/upload" element={<Upload />} />
            </Routes>
        </>
    )
}

export default App
