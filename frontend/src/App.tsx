import { Route, Routes } from "react-router-dom"
import Index from "./pages/Index"
import Upload from "./pages/Upload"
import Report from "./pages/Report"
import Summary from "./pages/Summary"
function App() {

    return (
        <>
            <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/report/:jobId?" element={<Report />} />
                <Route path="/summary/:jobId?" element={<Summary />} />
            </Routes>
        </>
    )
}

export default App
