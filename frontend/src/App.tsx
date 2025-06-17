import { Route, Routes } from "react-router-dom"
import Index from "./pages/Index"
import Upload from "./pages/Upload"
import Summary from "./pages/Summary"
import Store from "./pages/Store"

function App() {

    return (
        <>
            <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/summary/:jobId?" element={<Summary />} />
                <Route path="/store" element={<Store />} />
            </Routes>
        </>
    )
}

export default App
