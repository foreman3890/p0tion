import chai, { expect } from "chai"
import chaiAsPromised from "chai-as-promised"
import dotenv from "dotenv"
import { cwd } from "process"
import fs from "fs"
import {
    exportVerifierAndVKey,
    exportVerifierContract,
    exportVkey,
    generateGROTH16Proof,
    verifyGROTH16Proof
} from "../../src"
import { envType } from "../utils"
import { TestingEnvironment } from "../../src/types/enums"

chai.use(chaiAsPromised)
dotenv.config()

/**
 * Unit test for Verification utilities.
 */

describe("Verification utilities", () => {
    let wasmPath: string = ""
    let zkeyPath: string = ""
    let vkeyPath: string = ""

    if (envType === TestingEnvironment.DEVELOPMENT) {
        wasmPath = `${cwd()}/../actions/test/data/artifacts/circuit.wasm`
        zkeyPath = `${cwd()}/../actions/test/data/artifacts/circuit_0000.zkey`
        vkeyPath = `${cwd()}/../actions/test/data/artifacts/verification_key_circuit.json`
    } else {
        wasmPath = `${cwd()}/packages/actions/test/data/artifacts/circuit.wasm`
        zkeyPath = `${cwd()}/packages/actions/test/data/artifacts/circuit_0000.zkey`
        vkeyPath = `${cwd()}/packages/actions/test/data/artifacts/verification_key_circuit.json`
    }

    describe("generateGROTH16Proof", () => {
        it("should generate a GROTH16 proof", async () => {
            const inputs = {
                x1: "5",
                x2: "10",
                x3: "1",
                x4: "2"
            }
            const { proof } = await generateGROTH16Proof(inputs, zkeyPath, wasmPath)
            expect(proof).to.not.be.undefined
        })
        it("should fail to gnenerate a GROTH16 proof when given the wrong inputs", async () => {
            await expect(generateGROTH16Proof({}, zkeyPath, wasmPath)).to.be.rejectedWith(Error)
        })
        it("should fail to generate a GROTH16 proof when given the wrong zkey path", async () => {
            const inputs = {
                x1: "5",
                x2: "10",
                x3: "1",
                x4: "2"
            }
            await expect(generateGROTH16Proof(inputs, `${zkeyPath}1`, wasmPath)).to.be.rejectedWith(Error)
        })
    })
    describe("verifyGROTH16 Proof", () => {
        it("should return true for a valid proof", async () => {
            // generate
            const inputs = {
                x1: "13",
                x2: "7",
                x3: "4",
                x4: "2"
            }
            const { proof, publicSignals } = await generateGROTH16Proof(inputs, zkeyPath, wasmPath)
            expect(proof).to.not.be.undefined

            // verify
            const success = await verifyGROTH16Proof(vkeyPath, publicSignals, proof)
            expect(success).to.be.true
        })
        it("should fail when given an invalid vkey", async () => {
            // verify
            await expect(
                verifyGROTH16Proof(
                    `${cwd()}/packages/actions/test/data/artifacts/invalid_verification_key.json`,
                    ["3", "4"],
                    {}
                )
            ).to.be.rejected
        })
    })

    const finalZkeyPath = `${cwd()}/packages/actions/test/data/artifacts/circuit-small_00001.zkey`
    const verifierExportPath = `${cwd()}/packages/actions/test/data/artifacts/verifier.sol`
    const vKeyExportPath = `${cwd()}/packages/actions/test/data/artifacts/vkey.json`
    const solidityVersion = "0.8.10"

    describe("exportVerifierContract", () => {
        if (envType === TestingEnvironment.PRODUCTION) {
            it("should export the verifier contract", async () => {
                const solidityCode = await exportVerifierContract(
                    solidityVersion,
                    finalZkeyPath,
                    `${cwd()}/node_modules/snarkjs/templates/verifier_groth16.sol.ejs`
                )
                expect(solidityCode).to.not.be.undefined
            })
        }
        it("should fail when the zkey is not found", async () => {
            await expect(
                exportVerifierContract(
                    "0.8.0",
                    "invalid-path",
                    `${cwd()}/node_modules/snarkjs/templates/verifier_groth16.sol.ejs`
                )
            ).to.be.rejected
        })
    })
    describe("exportVkey", () => {
        if (envType === TestingEnvironment.PRODUCTION) {
            it("should export the vkey", async () => {
                const vKey = await exportVkey(finalZkeyPath)
                expect(vKey).to.not.be.undefined
            })
        }
        it("should fail when the zkey is not found", async () => {
            await expect(exportVkey("invalid-path")).to.be.rejected
        })
    })
    describe("exportVerifierAndVKey", () => {
        if (envType === TestingEnvironment.PRODUCTION) {
            it("should export the verifier contract and the vkey", async () => {
                await exportVerifierAndVKey(
                    "0.8.0",
                    finalZkeyPath,
                    verifierExportPath,
                    vKeyExportPath,
                    `${cwd()}/node_modules/snarkjs/templates/verifier_groth16.sol.ejs`
                )
                expect(fs.existsSync(verifierExportPath)).to.be.true
                expect(fs.existsSync(vKeyExportPath)).to.be.true
            })
        }
        it("should fail when the zkey is not found", async () => {
            await expect(
                exportVerifierAndVKey(
                    "0.8.0",
                    "invalid-path",
                    verifierExportPath,
                    vKeyExportPath,
                    `${cwd()}/node_modules/snarkjs/templates/verifier_groth16.sol.ejs`
                )
            ).to.be.rejected
        })
    })
    afterAll(() => {
        if (fs.existsSync(verifierExportPath)) {
            fs.unlinkSync(verifierExportPath)
        }
        if (fs.existsSync(vKeyExportPath)) {
            fs.unlinkSync(vKeyExportPath)
        }
    })
})